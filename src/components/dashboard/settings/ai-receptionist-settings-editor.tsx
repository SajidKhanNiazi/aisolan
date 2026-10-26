"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  HelpCircle,
  Play,
  Languages,
  MessageSquare,
  ShieldCheck,
  Send,
} from "lucide-react";
import { updateOwnerAiSettings } from "@/features/ai-receptionist/server";
import type {
  BusinessAiSettings,
  AiReceptionistMode,
  SalonFaqItem,
  SupportedLanguage,
  ChatMessage,
} from "@/features/ai-receptionist/types";

interface AiReceptionistSettingsEditorProps {
  businessId: string;
  businessSlug: string;
  salonName: string;
  initialSettings: BusinessAiSettings;
  activeMode: AiReceptionistMode;
  modelName: string;
  isOwnerOrManager: boolean;
}

export function AiReceptionistSettingsEditor({
  businessId,
  businessSlug,
  salonName,
  initialSettings,
  activeMode,
  modelName,
  isOwnerOrManager,
}: AiReceptionistSettingsEditorProps) {
  const [enabled, setEnabled] = useState(initialSettings.ai_receptionist_enabled);
  const [defaultLang, setDefaultLang] = useState<SupportedLanguage>(
    initialSettings.default_language || "en"
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialSettings.welcome_message || ""
  );
  const [faqs, setFaqs] = useState<SalonFaqItem[]>(
    initialSettings.faqs || []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Preview interactive state
  const [previewMessages, setPreviewMessages] = useState<ChatMessage[]>([]);
  const [previewInput, setPreviewInput] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handleAddFaq = () => {
    if (faqs.length >= 10) return;
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const handleFaqChange = (index: number, field: "question" | "answer", val: string) => {
    const updated = [...faqs];
    updated[index][field] = val;
    setFaqs(updated);
  };

  const handleSave = async () => {
    if (!isOwnerOrManager) return;
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await updateOwnerAiSettings({
        businessId,
        ai_receptionist_enabled: enabled,
        default_language: defaultLang,
        welcome_message: welcomeMessage.trim() || null,
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "AI Receptionist settings saved successfully!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to update AI Receptionist settings.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Network error saving settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPreview = async (msg?: string) => {
    const query = (msg || previewInput).trim();
    if (!query || isPreviewLoading) return;

    setPreviewInput("");
    const newMsgs: ChatMessage[] = [...previewMessages, { role: "user", content: query }];
    setPreviewMessages(newMsgs);
    setIsPreviewLoading(true);

    try {
      const res = await fetch(`/api/businesses/${businessSlug}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      setPreviewMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message || "No response received.",
        },
      ]);
    } catch {
      setPreviewMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect to preview chat.",
        },
      ]);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Status Card */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                AI Receptionist Engine
              </h3>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  activeMode === "openai"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : activeMode === "mock"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {activeMode === "openai"
                  ? `OpenAI (${modelName})`
                  : activeMode === "mock"
                  ? "Mock Mode"
                  : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {activeMode === "mock"
                ? "Zero-cost deterministic mode active. Real salon services, hours, and slots are queried live without external API keys."
                : activeMode === "openai"
                ? `Powered by OpenAI (${modelName}) with read-only server tool enforcement.`
                : "AI Receptionist is currently disabled globally. Activate via environment configuration."}
            </p>
          </div>
        </div>

        {/* Enable / Disable Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {enabled ? "Active on Booking Page" : "Disabled on Booking Page"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={!isOwnerOrManager}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              enabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
            } ${!isOwnerOrManager ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Salon AI Configuration
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure greeting language, welcome messages, and approved salon FAQs.
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5 max-w-sm">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-zinc-400" />
            <span>Default Assistant Language</span>
          </label>
          <select
            value={defaultLang}
            disabled={!isOwnerOrManager}
            onChange={(e) => setDefaultLang(e.target.value as SupportedLanguage)}
            className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English (Default)</option>
            <option value="ur">Urdu (اردو)</option>
            <option value="ur-Latn">Roman Urdu</option>
          </select>
        </div>

        {/* Custom Welcome Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>Custom Welcome Greeting (Optional)</span>
          </label>
          <textarea
            value={welcomeMessage}
            disabled={!isOwnerOrManager}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={`Hello! Welcome to ${salonName}. I'm your AI Virtual Receptionist. How can I assist you with services, prices, or finding a booking slot today?`}
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-zinc-400">
            Displayed to visitors when they first open the chat widget.
          </p>
        </div>

        {/* Approved Salon FAQs */}
        <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Approved Salon FAQs ({faqs.length}/10)</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Provide pre-approved answers to salon questions like parking, deposit policies, or payment methods.
              </p>
            </div>
            {isOwnerOrManager && faqs.length < 10 && (
              <button
                type="button"
                onClick={handleAddFaq}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-850/60 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    FAQ #{idx + 1}
                  </span>
                  {isOwnerOrManager && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                      aria-label="Remove FAQ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={faq.question}
                  disabled={!isOwnerOrManager}
                  onChange={(e) => handleFaqChange(idx, "question", e.target.value)}
                  placeholder="e.g. Do you have parking available?"
                  className="w-full text-xs px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
                <textarea
                  value={faq.answer}
                  disabled={!isOwnerOrManager}
                  onChange={(e) => handleFaqChange(idx, "answer", e.target.value)}
                  rows={2}
                  placeholder="e.g. Yes, free street parking is available directly outside the salon."
                  className="w-full text-xs p-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                />
              </div>
            ))}

            {faqs.length === 0 && (
              <p className="text-xs text-zinc-400 italic py-1">
                No custom FAQs added yet. The AI uses your services, staff, hours, and policies by default.
              </p>
            )}
          </div>
        </div>

        {/* Global Safety Note */}
        <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Safety Guaranteed:</strong> The assistant provides read-only salon information and live availability lookups, alongside structured conversational booking preparation. Live appointment creation and confirmation are controlled by server-side feature flags during this verification phase. System prompts and backend security policies are strictly enforced.
          </div>
        </div>

        {/* Status & Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            {statusMessage && (
              <div
                className={`flex items-center gap-1.5 text-xs ${
                  statusMessage.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {statusMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>

          {isOwnerOrManager && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save AI Settings"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Owner Preview Sandbox */}
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Live Assistant Preview Sandbox
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setPreviewMessages([])}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            Clear Preview Chat
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Test what customers will experience on your public booking page.
        </p>

        {/* Mini Preview Box */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col h-72">
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
            {previewMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 space-y-2">
                <Bot className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                <p>Send a message below to test salon knowledge, services, or slots!</p>
                <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleSendPreview("What services do you offer?")}
                    className="px-2 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] hover:border-blue-400"
                  >
                    What services do you offer?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendPreview("Are you open tomorrow?")}
                    className="px-2 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] hover:border-blue-400"
                  >
                    Are you open tomorrow?
                  </button>
                </div>
              </div>
            ) : (
              previewMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isPreviewLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-xl text-zinc-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <input
              type="text"
              value={previewInput}
              onChange={(e) => setPreviewInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSendPreview();
                }
              }}
              placeholder="Ask a question..."
              disabled={isPreviewLoading}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => handleSendPreview()}
              disabled={!previewInput.trim() || isPreviewLoading}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
              aria-label="Send preview"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
