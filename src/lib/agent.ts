import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { samePlace } from "@/lib/region";
import {
  formatFieldError,
  validateAgent,
  type AplsAgent,
  type FieldError,
} from "@/lib/propertyStandard";

export const AGENT_COOKIE = "agent_token";

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const cityPattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{1,79}$/u;
const licensePattern = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s-]{1,39}$/u;

export type PublicAgent = {
  id: number;
  name: string;
  agency: string;
  phone: string;
  email: string;
  country: string;
  city: string | null;
  license: string | null;
  website: string | null;
  createdAt: Date;
};

export type AgentProfile = PublicAgent & {
  properties: {
    id: number;
    title: string;
    price: number;
    location: string;
  }[];
};

export type AgentRegistration = AplsAgent & {
  password: string;
  city: string | null;
  license: string | null;
  website: string | null;
};

export class AgentError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AgentError";
    this.status = status;
  }
}

const publicAgentSelect = {
  id: true,
  name: true,
  agency: true,
  phone: true,
  email: true,
  country: true,
  city: true,
  license: true,
  createdAt: true,
  agencyRecord: {
    select: { website: true },
  },
} as const;

type AgentRow = {
  id: number;
  name: string;
  agency: string;
  phone: string;
  email: string;
  country: string;
  city: string | null;
  license: string | null;
  createdAt: Date;
  agencyRecord: { website: string | null } | null;
};

export function validateAgentRegistration(
  input: unknown,
): { ok: true; value: AgentRegistration } | { ok: false; errors: FieldError[] } {
  const base = validateAgent(input);
  const record =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const errors = base.ok ? [] : [...base.errors];
  const password = typeof record.password === "string" ? record.password : "";
  const city = readOptional(record.city);
  const license = readOptional(record.license);
  const website = readOptional(record.website);

  if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters.",
    });
  }
  if (!city || !cityPattern.test(city)) {
    errors.push({ field: "city", message: "Enter your region." });
  }
  if (license && !licensePattern.test(license)) {
    errors.push({ field: "license", message: "Enter a license number." });
  }
  if (website && (website.length > 200 || /\s/.test(website))) {
    errors.push({ field: "website", message: "Enter a website address." });
  }

  if (!base.ok || errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      ...base.value,
      password,
      city,
      license,
      website,
    },
  };
}

export function formatAgentErrors(errors: FieldError[]) {
  return errors.map(formatFieldError).join(" ");
}

export async function listAgents(location = ""): Promise<PublicAgent[]> {
  const agents = await prisma.agent.findMany({
    orderBy: { name: "asc" },
    select: publicAgentSelect,
  });
  const needle = location.trim().toLowerCase();
  const localAgents = needle
    ? agents.filter((agent) => matchesLocation(agent, needle))
    : agents;
  const visible = localAgents.length > 0 ? localAgents : agents;
  return visible.map(toPublicAgent);
}

export async function getAgentById(id: number): Promise<AgentProfile | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    select: {
      ...publicAgentSelect,
      properties: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          price: true,
          location: true,
        },
      },
    },
  });
  if (!agent) return null;
  return {
    ...toPublicAgent(agent),
    properties: agent.properties,
  };
}

export async function findAgentByEmail(email: string) {
  return prisma.agent.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: publicAgentSelect,
  });
}

export async function createAgentAccount(input: AgentRegistration) {
  const password = await bcrypt.hash(input.password, 12);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const agent = await tx.agent.create({
        data: {
          name: input.name,
          agency: input.agency,
          phone: input.phone,
          email: input.email,
          country: input.country,
          city: input.city,
          license: input.license,
          password,
        },
        select: { id: true },
      });
      await ensureAgency(tx, {
        agentId: agent.id,
        name: input.agency,
        country: input.country,
        website: input.website,
      });
      return tx.agent.findUniqueOrThrow({
        where: { id: agent.id },
        select: publicAgentSelect,
      });
    });
    return toPublicAgent(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AgentError("An agent with that email already exists.", 409);
    }
    throw error;
  }
}

export async function authenticateAgent(email: string, password: string) {
  const agent = await prisma.agent.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!agent?.password) {
    throw new AgentError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, agent.password);
  if (!passwordMatches) {
    throw new AgentError("Invalid email or password.", 401);
  }

  const profile = await getAgentById(agent.id);
  if (!profile) {
    throw new AgentError("Invalid email or password.", 401);
  }
  return profile;
}

export async function ensureAgency(
  tx: Prisma.TransactionClient,
  input: {
    agentId: number;
    name: string;
    country: string;
    website?: string | null;
  },
) {
  let firm = await tx.agency.findFirst({
    where: { name: input.name, country: input.country },
  });
  if (!firm) {
    firm = await tx.agency.create({
      data: {
        name: input.name,
        country: input.country,
        website: input.website ?? null,
      },
    });
  } else if (input.website) {
    firm = await tx.agency.update({
      where: { id: firm.id },
      data: { website: input.website },
    });
  }

  await tx.agent.update({
    where: { id: input.agentId },
    data: { agencyId: firm.id },
  });
  return firm;
}

export function generateAgentToken(agent: { id: number; email: string }) {
  return jwt.sign({ email: agent.email, role: "agent" }, getJwtSecret(), {
    subject: String(agent.id),
    expiresIn: TOKEN_MAX_AGE_SECONDS,
  });
}

export function verifyAgentToken(
  token: string,
): { id: number; email: string } | null {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (typeof payload === "string") return null;
    const claims = payload as JwtPayload;
    if (
      claims.role !== "agent" ||
      typeof claims.sub !== "string" ||
      typeof claims.email !== "string"
    ) {
      return null;
    }
    const id = Number(claims.sub);
    if (!Number.isInteger(id)) return null;
    return { id, email: claims.email };
  } catch {
    return null;
  }
}

export function setAgentCookie(response: NextResponse, token: string) {
  response.cookies.set(AGENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export async function getAgentFromCookie() {
  await connection();
  const token = (await cookies()).get(AGENT_COOKIE)?.value;
  if (!token) return null;
  return verifyAgentToken(token);
}

export async function requireAgent(returnPath = "/agents/dashboard") {
  const agent = await getAgentFromCookie();
  if (!agent) {
    redirect(`/agents/login?next=${encodeURIComponent(returnPath)}`);
  }
  return agent;
}

export async function listAvailableAgentsInRegion(
  country: string,
  city: string,
  limit?: number,
): Promise<PublicAgent[]> {
  const agents = await prisma.agent.findMany({
    where: { isAvailable: true },
    orderBy: { name: "asc" },
    select: publicAgentSelect,
  });
  const matches = agents.filter(
    (agent) => samePlace(agent.country, country) && samePlace(agent.city, city),
  );
  const visible = limit == null ? matches : matches.slice(0, limit);
  return visible.map(toPublicAgent);
}

function toPublicAgent(agent: AgentRow): PublicAgent {
  return {
    id: agent.id,
    name: agent.name,
    agency: agent.agency,
    phone: agent.phone,
    email: agent.email,
    country: agent.country,
    city: agent.city,
    license: agent.license,
    website: agent.agencyRecord?.website ?? null,
    createdAt: agent.createdAt,
  };
}

function matchesLocation(
  agent: { country: string; city: string | null },
  needle: string,
) {
  const country = agent.country.toLowerCase();
  const city = agent.city?.toLowerCase() ?? "";
  return (
    country.includes(needle) ||
    needle.includes(country) ||
    (city !== "" && (city.includes(needle) || needle.includes(city)))
  );
}

function readOptional(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AgentError("Server auth is not configured.", 500);
  }
  return secret;
}
