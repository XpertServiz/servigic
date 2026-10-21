import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { csvCell } from "@/lib/waitlistQuery";
import { LEAD_COLUMNS, PRO_COLUMNS, WAITLIST_COLUMNS, filterToParams, queryLeads, queryPros, queryWaitlist, type Cell, type Column, type Filter } from "@/lib/leadFilters";

export type ExportResource = "leads" | "pros" | "waitlist";
export type ExportFormat = "csv" | "xlsx";

export const COLUMN_SETS = {
  leads: LEAD_COLUMNS.map((c) => ({ key: c.key, label: c.label, default: !!c.default })),
  pros: PRO_COLUMNS.map((c) => ({ key: c.key, label: c.label, default: !!c.default })),
  waitlist: WAITLIST_COLUMNS.map((c) => ({ key: c.key, label: c.label, default: !!c.default })),
};

function slug(s: string) {
  return s.replace(/[^A-Za-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** e.g. pro_leads_Karachi_DHA-Clifton_Electrician_2026-10-18.xlsx */
export function exportFileName(resource: ExportResource, f: Filter, format: ExportFormat, areaNames: string[]): string {
  const base = resource === "leads" ? "pro_leads" : resource === "pros" ? "pros" : "early_list";
  const parts = [
    base,
    f.city.length ? slug(f.city.join("-")) : f.country.length ? slug(f.country.join("-")) : "",
    areaNames.length ? slug(areaNames.join("-")) : "",
    f.trades.length ? slug(f.trades.map((t) => t.toLowerCase().replace(/^./, (c) => c.toUpperCase()).replace(/_/g, "")).join("-")) : "",
    new Date().toISOString().slice(0, 10),
  ].filter(Boolean);
  return `${parts.join("_")}.${format}`;
}

function pick<T>(all: Column<T>[], keys: string[]): Column<T>[] {
  const chosen = keys.length ? all.filter((c) => keys.includes(c.key)) : all.filter((c) => c.default);
  return chosen.length ? chosen : all.filter((c) => c.default);
}

/**
 * Builds the file for the current filter and writes the audit row (who, when, filter, row count). Leads marked
 * do-not-contact never leave the system.
 */
export async function buildExport(resource: ExportResource, f: Filter, keys: string[], format: ExportFormat, admin: { id: string; name: string }) {
  let headers: string[] = [];
  let rows: Cell[][] = [];
  let areaNames: string[] = [];

  if (resource === "leads") {
    const res = await queryLeads(f, { all: true, excludeDnc: true });
    const cols = pick(LEAD_COLUMNS, keys);
    headers = cols.map((c) => c.label);
    rows = res.rows.map((l) => cols.map((c) => c.value(l, res.resolved)));
    areaNames = res.resolved.areas.filter((a) => res.resolved.areaIds.includes(a.id)).map((a) => a.name);
  } else if (resource === "pros") {
    const res = await queryPros(f);
    const cols = pick(PRO_COLUMNS, keys);
    headers = cols.map((c) => c.label);
    rows = res.rows.map((p) => cols.map((c) => c.value(p, res.resolved)));
    areaNames = res.resolved.areas.filter((a) => res.resolved.areaIds.includes(a.id)).map((a) => a.name);
  } else {
    const res = await queryWaitlist(f);
    const cols = pick(WAITLIST_COLUMNS, keys);
    headers = cols.map((c) => c.label);
    rows = res.rows.map((w) => cols.map((c) => c.value(w, res.resolved)));
    areaNames = res.resolved.areas.filter((a) => res.resolved.areaIds.includes(a.id)).map((a) => a.name);
  }

  let body: Buffer | string;
  let contentType: string;
  if (format === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(resource === "leads" ? "Pro leads" : resource === "pros" ? "Pros" : "Early list");
    ws.addRow(headers).font = { bold: true };
    for (const r of rows) ws.addRow(r.map((c) => (typeof c === "string" && /^[=+\-@]/.test(c) && !/^\+\d[\d\s]*$/.test(c) ? `'${c}` : c)));
    ws.columns.forEach((col) => (col.width = 18));
    ws.views = [{ state: "frozen", ySplit: 1 }];
    body = Buffer.from(await wb.xlsx.writeBuffer());
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    body = `﻿${[headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
    contentType = "text/csv; charset=utf-8";
  }

  await prisma.exportAudit.create({
    data: { adminId: admin.id, adminName: admin.name, resource, format, filter: filterToParams(f), columns: headers, rowCount: rows.length },
  });
  return { body, contentType, filename: exportFileName(resource, f, format, areaNames), rowCount: rows.length };
}
