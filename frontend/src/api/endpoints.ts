import { apiClient } from "./client";
import type {
  AuthResponse,
  GeoJSONPolygon,
  Project,
  ProjectDetail,
  ProjectType,
  Site,
  SiteMetric,
  SiteWithMetrics,
  User,
} from "../types";

export async function register(
  email: string,
  fullName: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", {
    email,
    full_name: fullName,
    password,
  });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", { email, password });
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/api/auth/me");
  return data;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>("/api/projects");
  return data;
}

export async function getProject(projectId: string): Promise<ProjectDetail> {
  const { data } = await apiClient.get<ProjectDetail>(`/api/projects/${projectId}`);
  return data;
}

export async function createProject(
  name: string,
  description: string,
  projectType: ProjectType,
): Promise<Project> {
  const { data } = await apiClient.post<Project>("/api/projects", {
    name,
    description,
    project_type: projectType,
  });
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/api/projects/${projectId}`);
}

export async function listAllSites(): Promise<Site[]> {
  const { data } = await apiClient.get<Site[]>("/api/sites");
  return data;
}

export async function createSite(
  projectId: string,
  name: string,
  description: string,
  geometry: GeoJSONPolygon,
): Promise<Site> {
  const { data } = await apiClient.post<Site>(`/api/projects/${projectId}/sites`, {
    name,
    description,
    geometry,
  });
  return data;
}

export async function getSite(siteId: string): Promise<SiteWithMetrics> {
  const { data } = await apiClient.get<SiteWithMetrics>(`/api/sites/${siteId}`);
  return data;
}

export async function getSiteMetrics(siteId: string): Promise<SiteMetric[]> {
  const { data } = await apiClient.get<SiteMetric[]>(`/api/sites/${siteId}/metrics`);
  return data;
}
