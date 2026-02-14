import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { DollarSign, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/format";
import type { BillingRate } from "@shared/schema";

function RatesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-6 w-40 mb-3" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function BillingRates() {
  usePageTitle("Billing Rates");
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<BillingRate | null>(null);
  const [formData, setFormData] = useState({
    code: "", name: "", description: "", unitLabel: "", rateCents: "",
  });

  const { data: rates, isLoading } = useQuery<BillingRate[]>({
    queryKey: ["/api/billing-rates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/billing-rates", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-rates"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Rate created", description: "New billing rate has been added." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/billing-rates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-rates"] });
      setDialogOpen(false);
      setEditingRate(null);
      resetForm();
      toast({ title: "Rate updated", description: "Billing rate has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/billing-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-rates"] });
      toast({ title: "Rate deleted", description: "Billing rate has been removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => setFormData({ code: "", name: "", description: "", unitLabel: "", rateCents: "" });

  const openCreate = () => {
    resetForm();
    setEditingRate(null);
    setDialogOpen(true);
  };

  const openEdit = (rate: BillingRate) => {
    setEditingRate(rate);
    setFormData({
      code: rate.code,
      name: rate.name,
      description: rate.description ?? "",
      unitLabel: rate.unitLabel,
      rateCents: String(rate.rateCents / 100),
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      unitLabel: formData.unitLabel,
      rateCents: Math.round(Number(formData.rateCents) * 100),
    };
    if (editingRate) {
      updateMutation.mutate({ id: editingRate.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <RatesSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Billing Rates</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your per-unit pricing for different types of work</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-rate">
          <Plus className="w-4 h-4 mr-2" />
          Add Rate
        </Button>
      </div>

      {rates && rates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((rate) => (
            <Card key={rate.id} className="p-5" data-testid={`card-rate-${rate.id}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(rate)} data-testid={`button-edit-rate-${rate.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(rate.id)} data-testid={`button-delete-rate-${rate.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold mb-1" data-testid={`text-rate-name-${rate.id}`}>{rate.name}</h3>
              {rate.description && (
                <p className="text-xs text-muted-foreground mb-3">{rate.description}</p>
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap mt-auto pt-3 border-t">
                <Badge variant="secondary" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {rate.code}
                </Badge>
                <span className="text-sm font-semibold" data-testid={`text-rate-price-${rate.id}`}>
                  {formatCurrency(rate.rateCents)} / {rate.unitLabel}
                </span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No billing rates configured. Add your first rate to get started.</p>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRate ? "Edit Rate" : "Add Billing Rate"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rate-name">Name *</Label>
              <Input id="rate-name" placeholder="e.g., Page Design" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required data-testid="input-rate-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-code">Code *</Label>
              <Input id="rate-code" placeholder="e.g., page_design" value={formData.code} onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))} required data-testid="input-rate-code" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate-price">Price ($) *</Label>
                <Input id="rate-price" type="number" min="0" step="0.01" placeholder="200.00" value={formData.rateCents} onChange={(e) => setFormData(p => ({ ...p, rateCents: e.target.value }))} required data-testid="input-rate-price" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-unit">Per Unit *</Label>
                <Input id="rate-unit" placeholder="e.g., page, asset, session" value={formData.unitLabel} onChange={(e) => setFormData(p => ({ ...p, unitLabel: e.target.value }))} required data-testid="input-rate-unit" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-desc">Description</Label>
              <Textarea id="rate-desc" placeholder="What this rate covers" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} data-testid="input-rate-description" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-rate">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingRate ? "Save Changes" : "Add Rate"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
