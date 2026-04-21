import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Contacts
export function useContacts(filters?: Record<string, string>) {
  const params = new URLSearchParams(filters).toString();
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: () => api.get(`/contacts${params ? `?${params}` : ""}`),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => api.get(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/contacts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/contacts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", id] });
    },
  });
}

// Workshops
export function useWorkshops(status?: string) {
  return useQuery({
    queryKey: ["workshops", status],
    queryFn: () => api.get(`/workshops${status ? `?status=${status}` : ""}`),
  });
}

export function useWorkshop(id: string) {
  return useQuery({
    queryKey: ["workshops", id],
    queryFn: () => api.get(`/workshops/${id}`),
    enabled: !!id,
  });
}

export function useCreateWorkshop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/workshops", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workshops"] }),
  });
}
