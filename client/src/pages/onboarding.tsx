import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Eye,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Pencil,
  Star,
  ToggleLeft,
  Inbox,
  Search,
  X,
  ChevronRight,
  Calendar,
  User,
} from "lucide-react";
import type { OnboardingQuestionnaire, OnboardingResponse, Customer } from "@shared/schema";

type FieldType = "text" | "textarea" | "select" | "checkbox" | "radio" | "file_upload";

interface QuestionnaireField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder: string;
  options: string[];
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio Buttons" },
  { value: "file_upload", label: "File Upload" },
];

function generateFieldId() {
  return "f_" + Math.random().toString(36).slice(2, 9);
}

export default function Onboarding() {
  usePageTitle("Onboarding");
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("questionnaires");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<OnboardingQuestionnaire | null>(null);
  const [viewResponseDialog, setViewResponseDialog] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState<QuestionnaireField[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsDefault, setFormIsDefault] = useState(false);

  const { data: questionnaires = [], isLoading: loadingQ } = useQuery<OnboardingQuestionnaire[]>({
    queryKey: ["/api/onboarding/questionnaires"],
  });

  const { data: responses = [], isLoading: loadingR } = useQuery<any[]>({
    queryKey: ["/api/onboarding/responses"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/onboarding/questionnaires", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/questionnaires"] });
      toast({ title: "Questionnaire created" });
      resetForm();
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create questionnaire", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/onboarding/questionnaires/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/questionnaires"] });
      toast({ title: "Questionnaire updated" });
      resetForm();
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to update questionnaire", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/onboarding/questionnaires/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/questionnaires"] });
      toast({ title: "Questionnaire deleted" });
    },
  });

  const updateResponseMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/onboarding/responses/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/responses"] });
      toast({ title: "Response status updated" });
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormFields([]);
    setFormIsActive(true);
    setFormIsDefault(false);
    setEditingQuestionnaire(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const openEditDialog = (q: OnboardingQuestionnaire) => {
    setEditingQuestionnaire(q);
    setFormTitle(q.title);
    setFormDescription(q.description || "");
    setFormIsActive(q.isActive ?? true);
    setFormIsDefault(q.isDefault ?? false);
    try {
      const parsed = typeof q.fields === "string" ? JSON.parse(q.fields) : q.fields;
      setFormFields(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFormFields([]);
    }
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (formFields.length === 0) {
      toast({ title: "Add at least one field", variant: "destructive" });
      return;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      fields: JSON.stringify(formFields),
      isActive: formIsActive,
      isDefault: formIsDefault,
    };

    if (editingQuestionnaire) {
      updateMutation.mutate({ id: editingQuestionnaire.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addField = () => {
    setFormFields([
      ...formFields,
      {
        id: generateFieldId(),
        label: "",
        type: "text",
        required: false,
        placeholder: "",
        options: [],
      },
    ]);
  };

  const updateField = (index: number, updates: Partial<QuestionnaireField>) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], ...updates };
    setFormFields(updated);
  };

  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formFields.length) return;
    const updated = [...formFields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFormFields(updated);
  };

  const handleToggleActive = (q: OnboardingQuestionnaire) => {
    updateMutation.mutate({
      id: q.id,
      data: { isActive: !(q.isActive ?? true) },
    });
  };

  const handleSetDefault = (q: OnboardingQuestionnaire) => {
    updateMutation.mutate({
      id: q.id,
      data: { isDefault: true },
    });
  };

  const getCustomerName = (customerId: string) => {
    const c = customers.find((c) => c.id === customerId);
    return c?.name || c?.email || customerId;
  };

  const getQuestionnaireName = (questionnaireId: string) => {
    const q = questionnaires.find((q) => q.id === questionnaireId);
    return q?.title || "Unknown";
  };

  const filteredResponses = responses.filter((r: any) => {
    if (!searchQuery) return true;
    const name = getCustomerName(r.customerId).toLowerCase();
    const qName = getQuestionnaireName(r.questionnaireId).toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || qName.includes(searchQuery.toLowerCase());
  });

  const totalQ = questionnaires.length;
  const activeQ = questionnaires.filter((q) => q.isActive).length;
  const totalR = responses.length;
  const reviewedR = responses.filter((r: any) => r.status === "reviewed").length;

  const needsOptions = (type: FieldType) => type === "select" || type === "radio" || type === "checkbox";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-onboarding-title">
            <ClipboardList className="w-6 h-6 text-violet-500" />
            Client Onboarding
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build intake questionnaires and review client responses.
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-questionnaire">
          <Plus className="w-4 h-4 mr-1.5" />
          New Questionnaire
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card data-testid="stat-total-questionnaires">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalQ}</div>
              <div className="text-xs text-muted-foreground">Questionnaires</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-active-questionnaires">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{activeQ}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-responses">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Inbox className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalR}</div>
              <div className="text-xs text-muted-foreground">Responses</div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-reviewed-responses">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{reviewedR}</div>
              <div className="text-xs text-muted-foreground">Reviewed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="questionnaires" className="flex items-center gap-1.5" data-testid="tab-questionnaires">
            <FileText className="w-3.5 h-3.5" />
            Questionnaires
          </TabsTrigger>
          <TabsTrigger value="responses" className="flex items-center gap-1.5" data-testid="tab-responses">
            <Inbox className="w-3.5 h-3.5" />
            Responses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questionnaires" className="space-y-4 mt-4">
          {loadingQ ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : questionnaires.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No questionnaires yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first intake questionnaire for client onboarding.
                </p>
                <Button onClick={openCreateDialog} data-testid="button-create-empty">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Questionnaire
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {questionnaires.map((q) => {
                let fieldCount = 0;
                try {
                  const _parsed = typeof q.fields === "string" ? JSON.parse(q.fields) : q.fields;
                  fieldCount = Array.isArray(_parsed) ? _parsed.length : 0;
                } catch {}
                return (
                  <Card key={q.id} data-testid={`card-questionnaire-${q.id}`}>
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-violet-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm truncate">{q.title}</span>
                              {q.isDefault && (
                                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                                  <Star className="w-2.5 h-2.5 mr-0.5" />
                                  Default
                                </Badge>
                              )}
                              {q.isActive ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px]">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                              {q.description ? ` \u00B7 ${q.description}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => openEditDialog(q)}
                            data-testid={`button-edit-${q.id}`}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {!q.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleSetDefault(q)}
                              data-testid={`button-set-default-${q.id}`}
                            >
                              <Star className="w-3 h-3 mr-1" />
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleToggleActive(q)}
                            data-testid={`button-toggle-active-${q.id}`}
                          >
                            <ToggleLeft className="w-3 h-3 mr-1" />
                            {q.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(q.id)}
                            data-testid={`button-delete-${q.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responses" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or questionnaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-responses"
            />
          </div>

          {loadingR ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredResponses.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Inbox className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">
                  {totalR === 0 ? "No responses yet" : "No results match your search"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {totalR === 0
                    ? "Responses will appear here when clients submit their questionnaires."
                    : "Try adjusting your search."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredResponses.map((r: any) => (
                <Card key={r.id} data-testid={`card-response-${r.id}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <User className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {getCustomerName(r.customerId)}
                            </span>
                            {r.status === "reviewed" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                                Reviewed
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                                Submitted
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {getQuestionnaireName(r.questionnaireId)}
                            </span>
                            {r.submittedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(r.submittedAt).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedResponse(r);
                            setViewResponseDialog(true);
                          }}
                          data-testid={`button-view-response-${r.id}`}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {r.status !== "reviewed" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => updateResponseMutation.mutate({ id: r.id, status: "reviewed" })}
                            data-testid={`button-mark-reviewed-${r.id}`}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Mark Reviewed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) { resetForm(); } setEditDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-violet-500" />
              {editingQuestionnaire ? "Edit Questionnaire" : "Create Questionnaire"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Website Project Intake"
                data-testid="input-questionnaire-title"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of this questionnaire..."
                rows={2}
                className="resize-none"
                data-testid="input-questionnaire-description"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} data-testid="switch-is-active" />
                <label className="text-sm font-medium">Active</label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formIsDefault} onCheckedChange={setFormIsDefault} data-testid="switch-is-default" />
                <label className="text-sm font-medium">Set as Default</label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Fields ({formFields.length})</label>
                <Button variant="outline" size="sm" onClick={addField} data-testid="button-add-field">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Field
                </Button>
              </div>

              {formFields.length === 0 && (
                <div className="py-8 text-center border border-dashed rounded-lg">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No fields yet. Click "Add Field" to get started.</p>
                </div>
              )}

              {formFields.map((field, index) => (
                <Card key={field.id} data-testid={`card-field-${index}`}>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        #{index + 1}
                      </span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, "up")}
                        disabled={index === 0}
                        data-testid={`button-field-up-${index}`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, "down")}
                        disabled={index === formFields.length - 1}
                        data-testid={`button-field-down-${index}`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                        data-testid={`button-field-remove-${index}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Label</label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          placeholder="Field label"
                          data-testid={`input-field-label-${index}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                        <Select
                          value={field.type}
                          onValueChange={(val) => updateField(index, { type: val as FieldType })}
                        >
                          <SelectTrigger data-testid={`select-field-type-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((ft) => (
                              <SelectItem key={ft.value} value={ft.value}>
                                {ft.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Placeholder</label>
                        <Input
                          value={field.placeholder}
                          onChange={(e) => updateField(index, { placeholder: e.target.value })}
                          placeholder="Placeholder text"
                          data-testid={`input-field-placeholder-${index}`}
                        />
                      </div>
                      <div className="flex items-end gap-3 pb-1">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(val) => updateField(index, { required: val })}
                          data-testid={`switch-field-required-${index}`}
                        />
                        <label className="text-sm font-medium">Required</label>
                      </div>
                    </div>

                    {needsOptions(field.type) && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Options (one per line)
                        </label>
                        <Textarea
                          value={field.options.join("\n")}
                          onChange={(e) =>
                            updateField(index, {
                              options: e.target.value.split("\n"),
                            })
                          }
                          placeholder={"Option 1\nOption 2\nOption 3"}
                          rows={3}
                          className="resize-none text-sm"
                          data-testid={`input-field-options-${index}`}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { resetForm(); setEditDialogOpen(false); }}
                data-testid="button-cancel-questionnaire"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-questionnaire"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                )}
                {editingQuestionnaire ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewResponseDialog} onOpenChange={setViewResponseDialog}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              Response Details
            </DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Customer</label>
                  <p className="text-sm font-medium">{getCustomerName(selectedResponse.customerId)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Questionnaire</label>
                  <p className="text-sm font-medium">{getQuestionnaireName(selectedResponse.questionnaireId)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Submitted</label>
                  <p className="text-sm">
                    {selectedResponse.submittedAt
                      ? new Date(selectedResponse.submittedAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="mt-0.5">
                    {selectedResponse.status === "reviewed" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                        Reviewed
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                        Submitted
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold">Answers</label>
                {(() => {
                  try {
                    const answers = typeof selectedResponse.responses === "string" ? JSON.parse(selectedResponse.responses) : selectedResponse.responses;
                    const q = questionnaires.find((q) => q.id === selectedResponse.questionnaireId);
                    let fields: QuestionnaireField[] = selectedResponse.questionnaireFields || [];
                    if (!fields.length && q) {
                      try { fields = typeof q.fields === "string" ? JSON.parse(q.fields) : q.fields; } catch {}
                    }

                    if (typeof answers === "object" && !Array.isArray(answers)) {
                      return Object.entries(answers).map(([key, value]) => {
                        const field = fields.find((f) => f.id === key || f.label === key);
                        return (
                          <div key={key} className="p-3 rounded-lg border bg-muted/30">
                            <label className="text-xs font-medium text-muted-foreground">
                              {field?.label || key}
                            </label>
                            <p className="text-sm mt-0.5 whitespace-pre-wrap">
                              {Array.isArray(value) ? (value as string[]).join(", ") : String(value || "—")}
                            </p>
                          </div>
                        );
                      });
                    }
                    return <p className="text-sm text-muted-foreground">Unable to parse responses.</p>;
                  } catch {
                    return <p className="text-sm text-muted-foreground">Unable to parse responses.</p>;
                  }
                })()}
              </div>

              {selectedResponse.status !== "reviewed" && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => {
                      updateResponseMutation.mutate({ id: selectedResponse.id, status: "reviewed" });
                      setSelectedResponse({ ...selectedResponse, status: "reviewed" });
                    }}
                    data-testid="button-mark-reviewed-dialog"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Mark as Reviewed
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
