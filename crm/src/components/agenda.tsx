"use client";

import { CalendarPlus, Phone, Trash2, Users, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { addDays, fmtDayMonth, toIso, todayIso } from "@/lib/dates";
import { calendarFile } from "@/lib/ics";
import { fullName } from "@/lib/rules";
import { download, uid } from "@/lib/send";
import { useStore } from "@/lib/store";
import type { Customer, Task } from "@/lib/types";
import { t } from "@/lib/i18n";

export const KIND_ICON = { task: CheckSquare, call: Phone, meeting: Users };

/** One line of the agenda: tick off, open the customer, add to the calendar, delete. */
export function AgendaItem({ task, customer, showCustomer = true }: { task: Task; customer?: Customer; showCustomer?: boolean }) {
  const { update } = useStore();
  const Icon = KIND_ICON[task.kind ?? "task"];
  const late = !task.done && task.due < todayIso();
  const when = [task.due === todayIso() ? t("Today") : fmtDayMonth(task.due), task.time].filter(Boolean).join(", ");
  return (
    <li className="flex items-start gap-1" data-testid="agenda-item">
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-white/5">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#2b8cee]" checked={task.done} onChange={() => update((d) => { const x = d.tasks.find((y) => y.id === task.id); if (x) x.done = !x.done; })} />
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${task.kind && task.kind !== "task" ? "text-primary" : "text-mute"}`} aria-label={t(task.kind === "call" ? "Call" : task.kind === "meeting" ? "Meeting" : "Task")} />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm ${task.done ? "text-mute line-through" : "text-white"}`}>{task.title}</span>
          <span className={`block text-xs ${late ? "text-bad" : "text-mute"}`}>
            {when}{late ? ` · ${t("overdue")}` : ""}{task.place ? ` · ${task.place}` : ""}
            {showCustomer && customer && <> · <Link href={`/customers/view/?id=${customer.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{fullName(customer)}</Link></>}
          </span>
        </span>
      </label>
      <button className="px-2 py-2 text-mute hover:text-primary" title={t("Add to calendar")} aria-label={t("Add to calendar")} onClick={() => download(`${(task.title || "termin").replace(/[^\w-]+/g, "-").slice(0, 40)}.ics`, calendarFile([{ task, customer }]), "text/calendar")}><CalendarPlus className="h-4 w-4" /></button>
      <button className="px-2 py-2 text-mute hover:text-bad" aria-label={t("Delete task")} onClick={() => update((d) => { d.tasks = d.tasks.filter((y) => y.id !== task.id); })}><Trash2 className="h-4 w-4" /></button>
    </li>
  );
}

/** Form for a to-do, call or meeting. Without `customerId` a customer picker is shown. */
export function AgendaForm({ customerId, customers }: { customerId?: string; customers?: Customer[] }) {
  const { update } = useStore();
  const [f, setF] = useState({ customerId: customerId ?? "", kind: "call" as NonNullable<Task["kind"]>, title: "", due: toIso(addDays(new Date(), 1)), time: "10:00", place: "" });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const who = customerId ?? f.customerId;
    if (!who) return;
    const title = f.title.trim() || t(f.kind === "call" ? "Call" : f.kind === "meeting" ? "Meeting" : "Follow up");
    update((d) => { d.tasks.unshift({ id: uid(), customerId: who, title, due: f.due, done: false, kind: f.kind, ...(f.kind !== "task" && f.time ? { time: f.time } : {}), ...(f.kind === "meeting" && f.place.trim() ? { place: f.place.trim() } : {}) }); }, `Planned: ${title}`);
    setF({ ...f, title: "", place: "" });
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-2" data-testid="agenda-form">
      {!customerId && customers && (
        <select className="input" aria-label={t("Customer")} value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value })} required>
          <option value="">{t("Choose customer")}</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{fullName(c)}{c.city ? `, ${c.city}` : ""}</option>)}
        </select>
      )}
      <div className="flex flex-wrap gap-2">
        <select className="input !w-auto" aria-label={t("Type")} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as NonNullable<Task["kind"]> })}>
          <option value="call">{t("Call")}</option><option value="meeting">{t("Meeting")}</option><option value="task">{t("Task")}</option>
        </select>
        <input className="input min-w-0 flex-1 basis-40" aria-label={t("What")} placeholder={t(f.kind === "call" ? "e.g. Discuss accident insurance" : f.kind === "meeting" ? "e.g. Advice appointment" : "New task")} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input type="date" aria-label={t("Date")} className="input !w-auto" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} required />
        {f.kind !== "task" && <input type="time" aria-label={t("Time")} className="input !w-auto" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />}
        {f.kind === "meeting" && <input className="input min-w-0 flex-1 basis-32" aria-label={t("Place")} placeholder={t("Place, e.g. office or video call")} value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} />}
        <button className="btn btn-primary">{t("Plan")}</button>
      </div>
    </form>
  );
}

/** Open items sorted by date and time. */
export const byWhen = (a: Task, b: Task) => a.due.localeCompare(b.due) || (a.time ?? "99").localeCompare(b.time ?? "99");

export function exportAgenda(items: { task: Task; customer?: Customer }[]) {
  download(`termine-${todayIso()}.ics`, calendarFile(items), "text/calendar");
}
