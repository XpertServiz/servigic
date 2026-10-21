import type { Filter } from "@/lib/leadFilters";
import { TRADE_LABELS } from "@/lib/trades";
import { LEAD_STATUS_LABEL, LEAD_STATUSES } from "@/lib/leads";

// The shared filter form of the Pro Leads, Pros and Early-list pages. A plain GET form, so a filtered page is a link
// that can be shared, saved as a preset, and turned into an export of exactly the same rows.
export interface FilterOptions {
  areas: { id: string; name: string; aliases: string[]; cityName: string }[];
  cities: string[];
  zones: { id: string; name: string }[];
  owners?: { id: string; name: string }[];
}
export type FilterField = "country" | "city" | "area" | "zone" | "distance" | "trade" | "q" | "status" | "source" | "owner" | "registered" | "consent" | "dates" | "contacted" | "followUp" | "exp" | "verification" | "founding" | "role";

const box = "rounded-[10px] border border-border-subtle bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent";
const lab = "text-xs text-text-muted";
const COUNTRIES: [string, string][] = [["PK", "Pakistan"], ["SA", "Saudi Arabia"], ["AE", "UAE"], ["CA", "Canada"], ["GB", "UK"], ["US", "USA"], ["QA", "Qatar"], ["KW", "Kuwait"]];
const SOURCES = ["WAITLIST", "APP", "IMPORT", "MANUAL", "GOOGLE_PLACES", "REFERRAL", "PRO_REFERRAL"];

function Multi({ name, label, options, selected, size = 4 }: { name: string; label: string; options: [string, string][]; selected: string[]; size?: number }) {
  return (
    <label className={lab}>
      <span className="mb-1 block">{label}</span>
      <select name={name} multiple size={size} defaultValue={selected} className={`${box} min-w-[9rem]`}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ action, f, options, fields, extraHidden }: { action: string; f: Filter; options: FilterOptions; fields: FilterField[]; extraHidden?: Record<string, string> }) {
  const has = (x: FilterField) => fields.includes(x);
  const tradeOptions = Object.entries(TRADE_LABELS).map(([k, v]) => [k, v.name] as [string, string]);
  const nearKind = f.near.split(":")[0] ?? "";
  return (
    <form method="get" action={action} className="mb-5 flex flex-wrap items-end gap-3 rounded-[14px] border border-border-subtle bg-bg-elevated/40 p-4">
      {Object.entries(extraHidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {has("q") && (
        <label className={lab}>
          <span className="mb-1 block">Search name / phone / skill</span>
          <input name="q" defaultValue={f.q} className={`${box} w-48`} />
        </label>
      )}
      {has("country") && <Multi name="country" label="Country" options={COUNTRIES} selected={f.country} />}
      {has("city") && <Multi name="city" label="City" options={options.cities.map((c) => [c, c] as [string, string])} selected={f.city} />}
      {has("area") && (
        <label className={lab}>
          <span className="mb-1 block">Area (names or aliases, comma separated)</span>
          <input name="area" list="area-list" defaultValue={f.areaText} placeholder="dha, clifton" className={`${box} w-56`} />
          <datalist id="area-list">
            {options.areas.flatMap((a) => [a.name, ...a.aliases.slice(0, 3)]).map((n, i) => (
              <option key={`${n}-${i}`} value={n} />
            ))}
          </datalist>
        </label>
      )}
      {has("zone") && (
        <>
          <Multi name="zone" label="Zone" options={options.zones.map((z) => [z.id, z.name] as [string, string])} selected={f.zoneIds} />
          <label className={lab}>
            <span className="mb-1 block">Live zones</span>
            <select name="zoneScope" defaultValue={f.zoneScope} className={box}>
              <option value="">Anywhere</option>
              <option value="inside">Inside live zones</option>
              <option value="outside">Outside live zones</option>
            </select>
          </label>
        </>
      )}
      {has("distance") && (
        <>
          <label className={lab}>
            <span className="mb-1 block">Within … km of</span>
            <div className="flex gap-2">
              <input name="km" type="number" min={1} step="any" defaultValue={f.km ?? ""} placeholder="km" className={`${box} w-20`} />
              <select name="nearKind" defaultValue={nearKind} className={box} aria-label="Near what">
                <option value="">(pick)</option>
                <option value="zone">a zone</option>
                <option value="area">an area</option>
                <option value="pin">a pin (lat,lng)</option>
              </select>
            </div>
          </label>
          <label className={lab}>
            <span className="mb-1 block">…the zone / area / pin</span>
            <input name="nearVal" list="near-list" defaultValue={f.near.split(":")[1] ?? ""} placeholder="id or 24.81,67.03" className={`${box} w-48`} />
            <datalist id="near-list">
              {options.zones.map((z) => (
                <option key={z.id} value={z.id}>{`zone: ${z.name}`}</option>
              ))}
              {options.areas.map((a) => (
                <option key={a.id} value={a.id}>{`area: ${a.name}`}</option>
              ))}
            </datalist>
          </label>
        </>
      )}
      {has("trade") && <Multi name="trade" label="Trade" options={tradeOptions} selected={f.trades} size={5} />}
      {has("status") && <Multi name="status" label="Status" options={LEAD_STATUSES.map((s) => [s, LEAD_STATUS_LABEL[s]] as [string, string])} selected={f.status} size={5} />}
      {has("source") && <Multi name="source" label="Source" options={SOURCES.map((s) => [s, s.replace(/_/g, " ").toLowerCase()] as [string, string])} selected={f.source} />}
      {has("owner") && (
        <label className={lab}>
          <span className="mb-1 block">Owner</span>
          <select name="owner" defaultValue={f.owner} className={box}>
            <option value="">Anyone</option>
            <option value="me">Me</option>
            <option value="none">Unassigned</option>
            {(options.owners ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
      )}
      {has("registered") && (
        <label className={lab}>
          <span className="mb-1 block">Registered in app</span>
          <select name="registered" defaultValue={f.registered} className={box}>
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      )}
      {has("consent") && (
        <label className={lab}>
          <span className="mb-1 block">Consent</span>
          <select name="consent" defaultValue={f.consent} className={box}>
            <option value="">Any</option>
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      )}
      {has("verification") && (
        <label className={lab}>
          <span className="mb-1 block">Verification</span>
          <select name="verification" defaultValue={f.verification} className={box}>
            <option value="">Any</option>
            <option value="verified">Verified</option>
            <option value="unverified">Not verified</option>
          </select>
        </label>
      )}
      {has("founding") && (
        <label className={lab}>
          <span className="mb-1 block">Founding Pro</span>
          <select name="founding" defaultValue={f.founding} className={box}>
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      )}
      {has("role") && (
        <label className={lab}>
          <span className="mb-1 block">Role</span>
          <select name="role" defaultValue={f.role} className={box}>
            <option value="">All</option>
            <option value="CUSTOMER">Customers</option>
            <option value="PROVIDER">Pros</option>
          </select>
        </label>
      )}
      {has("exp") && (
        <label className={lab}>
          <span className="mb-1 block">Min. years experience</span>
          <input name="expMin" type="number" min={0} defaultValue={f.expMin ?? ""} className={`${box} w-24`} />
        </label>
      )}
      {has("followUp") && (
        <label className={lab}>
          <span className="mb-1 block">Follow-up</span>
          <select name="followUp" defaultValue={f.followUp} className={box}>
            <option value="">Any</option>
            <option value="today">Due today or earlier</option>
            <option value="due">Overdue</option>
          </select>
        </label>
      )}
      {has("dates") && (
        <>
          <label className={lab}>
            <span className="mb-1 block">Created from</span>
            <input type="date" name="from" defaultValue={f.createdFrom} className={box} />
          </label>
          <label className={lab}>
            <span className="mb-1 block">to</span>
            <input type="date" name="to" defaultValue={f.createdTo} className={box} />
          </label>
        </>
      )}
      {has("contacted") && (
        <>
          <label className={lab}>
            <span className="mb-1 block">Last contacted from</span>
            <input type="date" name="cfrom" defaultValue={f.contactedFrom} className={box} />
          </label>
          <label className={lab}>
            <span className="mb-1 block">to</span>
            <input type="date" name="cto" defaultValue={f.contactedTo} className={box} />
          </label>
        </>
      )}
      <button type="submit" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">Filter</button>
      <a href={action} className="px-2 py-2 text-sm text-text-muted hover:text-text">Clear</a>
    </form>
  );
}
