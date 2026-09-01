import axios from "axios"

function getBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  url = url.trim().replace(/\/+$/, "")

  // If bare domain like backend-xxx.up.railway.app is provided without protocol, prepend https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = url.includes("localhost") ? `http://${url}` : `https://${url}`
  }

  // Ensure path ends with /api/v1
  if (!url.endsWith("/api/v1")) {
    url = `${url}/api/v1`
  }

  return url
}

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // For sending cookies/tokens if configured
})

// Optional interceptor for token injection
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// API Endpoints
export const authApi = {
  login: (data: any) => api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
}

export const projectsApi = {
  getAll: () => api.get("/projects/"),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post("/projects/", data),
  updateStatus: (id: string, status: string) => api.patch(`/projects/${id}?status_val=${status}`),
  getWorkerRequirements: (id: string) => api.get(`/projects/${id}/worker-requirements`),
  getMaterialRequests: (id: string) => api.get(`/projects/${id}/material-requests`),
  getMasterPlans: (id: string) => api.get(`/projects/${id}/master-plans`),
  uploadMasterPlan: (id: string, formData: FormData) => api.post(`/projects/${id}/master-plans`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  assignSiteManager: (id: string, email: string) => api.post(`/projects/${id}/site-managers`, { email }),
  getSiteManagers: (id: string) => api.get(`/projects/${id}/site-managers`),
  removeSiteManager: (id: string, userId: string) => api.delete(`/projects/${id}/site-managers/${userId}`),
}

export const masterPlansApi = {
  getById: (planId: string) => api.get(`/master-plans/${planId}`),
  addVersion: (planId: string, formData: FormData) => api.post(`/master-plans/${planId}/versions`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  getDownloadUrl: (planId: string, versionId: string) => api.get(`/master-plans/${planId}/versions/${versionId}/download`),
}

export const workerRequirementsApi = {
  getAll: () => api.get("/worker-requirements/"),
  getById: (id: string) => api.get(`/worker-requirements/${id}`),
  create: (projectId: string, data: any) => api.post(`/projects/${projectId}/worker-requirements`, data),
  getMyWork: () => api.get("/worker-requirements/my-work"),
  submitResponse: (id: string, data: any) => api.post(`/worker-requirements/${id}/responses`, data),
}

export const materialRequestsApi = {
  getAll: () => api.get("/material-requests/"),
  getById: (id: string) => api.get(`/material-requests/${id}`),
  create: (projectId: string, data: any) => api.post(`/projects/${projectId}/material-requests`, data),
  updateStatus: (id: string, status: string) => api.patch(`/material-requests/${id}/status`, { status }),
  openRfp: (id: string) => api.post(`/material-requests/${id}/rfp`),
  compareQuotes: (id: string) => api.get(`/material-requests/${id}/rfp/quotes/compare`),
}

export const publicApi = {
  initSession: () => api.post("/public/sessions/"),
  verifyQuotation: (id: string) => api.get(`/public/quotations/${id}`),
  chat: (data: any) => api.post("/public/chat/message", data),
}

export const companiesApi = {
  create: (data: any) => api.post("/companies/", data),
  getById: (companyId: string) => api.get(`/companies/${companyId}`),
  getProjects: (companyId: string) => api.get(`/companies/${companyId}/projects`),
  createProject: (companyId: string, data: any) => api.post(`/companies/${companyId}/projects`, data),
}

export const deliveriesApi = {
  getAll: () => api.get("/deliveries/"),
  getEta: (id: string) => api.get(`/deliveries/${id}/eta`),
  createDriverLink: (deliveryId: string, driverId: string) => api.post(`/deliveries/${deliveryId}/driver-link?driver_id=${driverId}`),
  postLocationUpdate: (deliveryId: string, data: any) => api.post(`/deliveries/${deliveryId}/location-updates`, data),
}

export const vendorsApi = {
  getOpenRfps: () => api.get("/vendors/rfps"),
  submitQuote: (rfpId: string, data: any) => api.post(`/vendors/rfps/${rfpId}/quotes`, data),
  withdrawQuote: (rfpId: string, quoteId: string) => api.patch(`/vendors/rfps/${rfpId}/quotes/${quoteId}/withdraw`),
  getMyQuotes: () => api.get("/vendors/my-quotes"),
}

export const notificationsApi = {
  getAll: () => api.get("/notifications/"),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/mark-all-read"),
}

