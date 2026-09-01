"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Check, X, ExternalLink, RefreshCw, Download } from "lucide-react";
import { updatePartnerFisaAction, backfillPartnerFromOldestOpportunityAction, preiaDateFinanciareAnafAction } from "@/lib/actions/partener-fisa";
import { getCompanyLogoUrl } from "@/lib/logo";
import { JUDETE } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import type { PartnerDetail } from "@/lib/data/partener-fisa";
import type { Nomenclator } from "@/types/opportunity";

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]";
const labelClass = "mb-1 block text-[11px] text-text-muted";
const optionStyle = { backgroundColor: "var(--surface-1)" };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary">{value || <span className="text-text-faint">—</span>}</span>
    </div>
  );
}

export function PartnerFisaClient({
  partner,
  domeniiActivitate,
  contracte,
}: {
  partner: PartnerDetail;
  domeniiActivitate: Nomenclator[];
  contracte?: {
    generate: { id: string; created_at: string; status: string; downloadUrl: string | null }[];
    registru: { id: string; nr_contract: number; tip_partener: string; data_contract: string | null; tip_document: string | null }[];
  };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isBackfilling, startBackfilling] = useTransition();
  const [isPreluandFinanciar, startPreluandFinanciar] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [website, setWebsite] = useState(partner.website ?? "");
  const [codCaen, setCodCaen] = useState(partner.cod_caen ?? "");
  const logoUrl = getCompanyLogoUrl(partner.website, 128);
  const [domeniuId, setDomeniuId] = useState(partner.domeniul_activitate_id ?? "");
  const [judet, setJudet] = useState(partner.judet ?? "");
  const [oras, setOras] = useState(partner.oras ?? "");
  const [adresa, setAdresa] = useState(partner.adresa ?? "");
  const [regCom, setRegCom] = useState(partner.reg_com ?? "");
  const [formaJuridica, setFormaJuridica] = useState(partner.forma_juridica ?? "");
  const [atributFiscal, setAtributFiscal] = useState(partner.atribut_fiscal ?? "RO");
  const [reprezentantNume, setReprezentantNume] = useState(partner.reprezentant_nume ?? "");
  const [reprezentantFunctie, setReprezentantFunctie] = useState(partner.reprezentant_functie ?? "");
  const [cifraAfaceri, setCifraAfaceri] = useState(String(partner.cifra_afaceri ?? ""));
  const [cifraAfaceriAn, setCifraAfaceriAn] = useState(String(partner.cifra_afaceri_an ?? ""));
  const [nrAngajati, setNrAngajati] = useState(String(partner.nr_angajati ?? ""));
  const [nrVehicule, setNrVehicule] = useState(String(partner.nr_vehicule ?? ""));

  const [contactNume, setContactNume] = useState(partner.contact_nume ?? "");
  const [contactFunctie, setContactFunctie] = useState(partner.contact_functie ?? "");
  const [contactTelefon, setContactTelefon] = useState(partner.contact_telefon ?? "");
  const [contactEmail, setContactEmail] = useState(partner.contact_email ?? "");
  const [contact2Nume, setContact2Nume] = useState(partner.contact2_nume ?? "");
  const [contact2Functie, setContact2Functie] = useState(partner.contact2_functie ?? "");
  const [contact2Telefon, setContact2Telefon] = useState(partner.contact2_telefon ?? "");
  const [contact2Email, setContact2Email] = useState(partner.contact2_email ?? "");

  const [solutiaExistenta, setSolutiaExistenta] = useState(partner.solutia_existenta ?? "");
  const [clientNovasoft, setClientNovasoft] = useState(partner.client_novasoft);
  const [clientWindsoft, setClientWindsoft] = useState(partner.client_windsoft);
  const [contabilitateInterna, setContabilitateInterna] = useState(partner.contabilitate_interna ?? "");
  const [solutieContabilitate, setSolutieContabilitate] = useState(partner.solutie_contabilitate ?? "");
  const [maiMulteFirme, setMaiMulteFirme] = useState(partner.mai_multe_firme_grup);
  const [nrSocietati, setNrSocietati] = useState(String(partner.nr_societati_suplimentare ?? ""));
  const [numeSocietati, setNumeSocietati] = useState(partner.nume_societati_suplimentare ?? "");
  const [potentialFonduri, setPotentialFonduri] = useState(partner.potential_fonduri_europene);
  const [combustibil1, setCombustibil1] = useState(partner.furnizori_combustibil_1 ?? "");
  const [combustibil2, setCombustibil2] = useState(partner.furnizori_combustibil_2 ?? "");
  const [combustibil3, setCombustibil3] = useState(partner.furnizori_combustibil_3 ?? "");
  const [gps1, setGps1] = useState(partner.furnizori_gps_1 ?? "");
  const [gps2, setGps2] = useState(partner.furnizori_gps_2 ?? "");
  const [detaliiSoftware, setDetaliiSoftware] = useState(partner.detalii_suplimentare_software ?? "");

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updatePartnerFisaAction(partner.id, {
        website: website || null,
        cod_caen: codCaen || null,
        domeniul_activitate_id: domeniuId || null,
        judet: judet || null,
        oras: oras || null,
        adresa: adresa || null,
        reg_com: regCom || null,
        forma_juridica: formaJuridica || null,
        atribut_fiscal: atributFiscal || "RO",
        reprezentant_nume: reprezentantNume || null,
        reprezentant_functie: reprezentantFunctie || null,
        cifra_afaceri: cifraAfaceri ? Number(cifraAfaceri) : null,
        cifra_afaceri_an: cifraAfaceriAn ? Number(cifraAfaceriAn) : null,
        nr_angajati: nrAngajati ? Number(nrAngajati) : null,
        nr_vehicule: nrVehicule ? Number(nrVehicule) : null,
        contact_nume: contactNume || null,
        contact_functie: contactFunctie || null,
        contact_telefon: contactTelefon || null,
        contact_email: contactEmail || null,
        contact2_nume: contact2Nume || null,
        contact2_functie: contact2Functie || null,
        contact2_telefon: contact2Telefon || null,
        contact2_email: contact2Email || null,
        solutia_existenta: solutiaExistenta || null,
        client_novasoft: clientNovasoft,
        client_windsoft: clientWindsoft,
        contabilitate_interna: contabilitateInterna || null,
        solutie_contabilitate: solutieContabilitate || null,
        mai_multe_firme_grup: maiMulteFirme,
        nr_societati_suplimentare: nrSocietati ? Number(nrSocietati) : null,
        nume_societati_suplimentare: numeSocietati || null,
        potential_fonduri_europene: potentialFonduri,
        furnizori_combustibil_1: combustibil1 || null,
        furnizori_combustibil_2: combustibil2 || null,
        furnizori_combustibil_3: combustibil3 || null,
        furnizori_gps_1: gps1 || null,
        furnizori_gps_2: gps2 || null,
        detalii_suplimentare_software: detaliiSoftware || null,
      });
      if (result.success) {
        setEditing(false);
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare la salvare.");
      }
    });
  }

  function handleBackfill() {
    setMessage(null);
    startBackfilling(async () => {
      const result = await backfillPartnerFromOldestOpportunityAction(partner.id);
      if (result.success) {
        setMessage(
          result.nrCompletate
            ? `${result.nrCompletate} campuri completate din cea mai veche oportunitate legata.`
            : "Nimic de completat - toate campurile relevante sunt deja setate."
        );
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare.");
      }
    });
  }

  function handlePreiaDateFinanciare() {
    setMessage(null);
    startPreluandFinanciar(async () => {
      const result = await preiaDateFinanciareAnafAction(partner.id);
      setMessage(result.message ?? (result.success ? "Preluat." : "Eroare."));
      if (result.success) router.refresh();
    });
  }

  /**
   * Resincronizeaza toate campurile locale din fisa (partner prop) chiar
   * inainte de a intra in modul de editare - fara asta, campurile de
   * editare raman "inghetate" la valorile de la montarea componentei (ex.
   * inainte de un "Preia din oportunitate"), iar salvarea ar suprascrie cu
   * date vechi tot ce tocmai fusese completat.
   */
  function startEditing() {
    setWebsite(partner.website ?? "");
    setCodCaen(partner.cod_caen ?? "");
    setDomeniuId(partner.domeniul_activitate_id ?? "");
    setJudet(partner.judet ?? "");
    setOras(partner.oras ?? "");
    setAdresa(partner.adresa ?? "");
    setRegCom(partner.reg_com ?? "");
    setFormaJuridica(partner.forma_juridica ?? "");
    setAtributFiscal(partner.atribut_fiscal ?? "RO");
    setReprezentantNume(partner.reprezentant_nume ?? "");
    setReprezentantFunctie(partner.reprezentant_functie ?? "");
    setCifraAfaceri(String(partner.cifra_afaceri ?? ""));
    setCifraAfaceriAn(String(partner.cifra_afaceri_an ?? ""));
    setNrAngajati(String(partner.nr_angajati ?? ""));
    setNrVehicule(String(partner.nr_vehicule ?? ""));
    setContactNume(partner.contact_nume ?? "");
    setContactFunctie(partner.contact_functie ?? "");
    setContactTelefon(partner.contact_telefon ?? "");
    setContactEmail(partner.contact_email ?? "");
    setContact2Nume(partner.contact2_nume ?? "");
    setContact2Functie(partner.contact2_functie ?? "");
    setContact2Telefon(partner.contact2_telefon ?? "");
    setContact2Email(partner.contact2_email ?? "");
    setSolutiaExistenta(partner.solutia_existenta ?? "");
    setClientNovasoft(partner.client_novasoft);
    setClientWindsoft(partner.client_windsoft);
    setContabilitateInterna(partner.contabilitate_interna ?? "");
    setSolutieContabilitate(partner.solutie_contabilitate ?? "");
    setMaiMulteFirme(partner.mai_multe_firme_grup);
    setNrSocietati(String(partner.nr_societati_suplimentare ?? ""));
    setNumeSocietati(partner.nume_societati_suplimentare ?? "");
    setPotentialFonduri(partner.potential_fonduri_europene);
    setCombustibil1(partner.furnizori_combustibil_1 ?? "");
    setCombustibil2(partner.furnizori_combustibil_2 ?? "");
    setCombustibil3(partner.furnizori_combustibil_3 ?? "");
    setGps1(partner.furnizori_gps_1 ?? "");
    setGps2(partner.furnizori_gps_2 ?? "");
    setDetaliiSoftware(partner.detalii_suplimentare_software ?? "");
    setEditing(true);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="mt-0.5 h-10 w-10 shrink-0 rounded-md border border-border-subtle bg-white object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div>
            <h1 className="text-xl font-heading text-text-primary">{partner.nume}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {partner.cod_fiscal && <span className="text-text-muted">CIF: {partner.cod_fiscal}</span>}
              {partner.facturabil && (
              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-green-400">Client</span>
            )}
            {partner.este_furnizor && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">Furnizor</span>
            )}
            {partner.nume_grup && (
              <span className="rounded-full bg-[#E8007A]/15 px-2 py-0.5 text-[#E8007A]">
                Grup: {partner.nume_grup}
              </span>
            )}
          </div>
        </div>
        </div>
        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface-1"
          >
            <Pencil size={13} />
            Editeaza fisa
          </button>
        )}
      </div>

      {message && <p className="mb-3 text-xs text-amber-400">{message}</p>}

      {!editing && partner.oportunitati.length > 0 && (
        <button
          onClick={handleBackfill}
          disabled={isBackfilling}
          className="mb-4 flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw size={12} className={isBackfilling ? "animate-spin" : ""} />
          Completeaza campurile goale din cea mai veche oportunitate
        </button>
      )}

      {/* Firma */}
      <div className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Firma</p>
          {!editing && partner.cod_fiscal && (
            <button
              onClick={handlePreiaDateFinanciare}
              disabled={isPreluandFinanciar}
              title="Preia cifra de afaceri (convertita EUR) si nr. angajati din bilantul ANAF, gratuit, dupa CIF"
              className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1 text-[11px] text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
            >
              <RefreshCw size={11} className={isPreluandFinanciar ? "animate-spin" : ""} />
              Preia date financiare (ANAF)
            </button>
          )}
        </div>
        {editing ? (
          <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className={labelClass}>Website</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="ex: exemplu.ro"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Domeniu activitate</label>
              <select value={domeniuId} onChange={(e) => setDomeniuId(e.target.value)} className={inputClass}>
                <option value="" style={optionStyle}>
                  Selecteaza...
                </option>
                {domeniiActivitate.map((d) => (
                  <option key={d.id} value={d.id} style={optionStyle}>
                    {d.valoare}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Cod CAEN</label>
              <input
                value={codCaen}
                onChange={(e) => setCodCaen(e.target.value)}
                placeholder="ex: 4941"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Judet</label>
              <select value={judet} onChange={(e) => setJudet(e.target.value)} className={inputClass}>
                <option value="" style={optionStyle}>
                  Selecteaza...
                </option>
                {JUDETE.map((j) => (
                  <option key={j} value={j} style={optionStyle}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Oras</label>
              <input value={oras} onChange={(e) => setOras(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nr. angajati</label>
              <input
                type="number"
                value={nrAngajati}
                onChange={(e) => setNrAngajati(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cifra afaceri (EUR)</label>
              <input
                type="number"
                value={cifraAfaceri}
                onChange={(e) => setCifraAfaceri(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>An cifra afaceri</label>
              <input
                type="number"
                value={cifraAfaceriAn}
                onChange={(e) => setCifraAfaceriAn(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Nr. vehicule</label>
              <input
                type="number"
                value={nrVehicule}
                onChange={(e) => setNrVehicule(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-text-secondary">
            Date pentru contracte
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Adresa completa (strada, numar)</label>
              <input value={adresa} onChange={(e) => setAdresa(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nr. Registrul Comertului</label>
              <input
                value={regCom}
                onChange={(e) => setRegCom(e.target.value)}
                placeholder="ex: J40/1234/2020"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Forma juridica</label>
              <input
                value={formaJuridica}
                onChange={(e) => setFormaJuridica(e.target.value)}
                placeholder="ex: SRL"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Atribut fiscal</label>
              <input value={atributFiscal} onChange={(e) => setAtributFiscal(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reprezentant legal (nume)</label>
              <input value={reprezentantNume} onChange={(e) => setReprezentantNume(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Functia reprezentantului</label>
              <input
                value={reprezentantFunctie}
                onChange={(e) => setReprezentantFunctie(e.target.value)}
                placeholder="ex: Administrator"
                className={inputClass}
              />
            </div>
          </div>
          </>
        ) : (
          <div className="divide-y divide-white/5">
            <InfoRow label="Website" value={partner.website} />
            <InfoRow label="Domeniu activitate" value={partner.domeniul_activitate} />
            <InfoRow label="Cod CAEN" value={partner.cod_caen} />
            <InfoRow label="Judet" value={partner.judet} />
            <InfoRow label="Oras" value={partner.oras} />
            <InfoRow label="Adresa" value={partner.adresa} />
            <InfoRow label="Nr. Registrul Comertului" value={partner.reg_com} />
            <InfoRow label="Forma juridica" value={partner.forma_juridica} />
            <InfoRow label="Atribut fiscal" value={partner.atribut_fiscal} />
            <InfoRow label="Reprezentant legal" value={partner.reprezentant_nume} />
            <InfoRow label="Functia reprezentantului" value={partner.reprezentant_functie} />
            <InfoRow label="Nr. angajati" value={partner.nr_angajati} />
            <InfoRow
              label="Cifra afaceri"
              value={partner.cifra_afaceri ? `${formatEur(partner.cifra_afaceri)} (${partner.cifra_afaceri_an ?? "—"})` : null}
            />
            <InfoRow label="Nr. vehicule" value={partner.nr_vehicule} />
          </div>
        )}
      </div>

      {/* Contacte */}
      <div className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Persoane de contact</p>
        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Contact 1</p>
              <input placeholder="Nume" value={contactNume} onChange={(e) => setContactNume(e.target.value)} className={inputClass} />
              <input placeholder="Functie" value={contactFunctie} onChange={(e) => setContactFunctie(e.target.value)} className={inputClass} />
              <input placeholder="Telefon" value={contactTelefon} onChange={(e) => setContactTelefon(e.target.value)} className={inputClass} />
              <input placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Contact 2</p>
              <input placeholder="Nume" value={contact2Nume} onChange={(e) => setContact2Nume(e.target.value)} className={inputClass} />
              <input placeholder="Functie" value={contact2Functie} onChange={(e) => setContact2Functie(e.target.value)} className={inputClass} />
              <input placeholder="Telefon" value={contact2Telefon} onChange={(e) => setContact2Telefon(e.target.value)} className={inputClass} />
              <input placeholder="Email" value={contact2Email} onChange={(e) => setContact2Email(e.target.value)} className={inputClass} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="divide-y divide-white/5">
              <InfoRow label="Nume" value={partner.contact_nume} />
              <InfoRow label="Functie" value={partner.contact_functie} />
              <InfoRow label="Telefon" value={partner.contact_telefon} />
              <InfoRow label="Email" value={partner.contact_email} />
            </div>
            <div className="divide-y divide-white/5">
              <InfoRow label="Nume" value={partner.contact2_nume} />
              <InfoRow label="Functie" value={partner.contact2_functie} />
              <InfoRow label="Telefon" value={partner.contact2_telefon} />
              <InfoRow label="Email" value={partner.contact2_email} />
            </div>
          </div>
        )}
      </div>

      {/* Calificare */}
      <div className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Calificare tehnica</p>
        {editing ? (
          <div className="space-y-2.5">
            <div>
              <label className={labelClass}>Solutia existenta</label>
              <input value={solutiaExistenta} onChange={(e) => setSolutiaExistenta(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-1.5 text-sm text-text-primary">
                <input type="checkbox" checked={clientNovasoft} onChange={(e) => setClientNovasoft(e.target.checked)} />
                Client Novasoft
              </label>
              <label className="flex items-center gap-1.5 text-sm text-text-primary">
                <input type="checkbox" checked={clientWindsoft} onChange={(e) => setClientWindsoft(e.target.checked)} />
                Client Windsoft
              </label>
              <label className="flex items-center gap-1.5 text-sm text-text-primary">
                <input type="checkbox" checked={potentialFonduri} onChange={(e) => setPotentialFonduri(e.target.checked)} />
                Potential fonduri europene
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelClass}>Contabilitate interna</label>
                <input value={contabilitateInterna} onChange={(e) => setContabilitateInterna(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Solutie contabilitate</label>
                <input value={solutieContabilitate} onChange={(e) => setSolutieContabilitate(e.target.value)} className={inputClass} />
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-text-primary">
              <input type="checkbox" checked={maiMulteFirme} onChange={(e) => setMaiMulteFirme(e.target.checked)} />
              Mai multe firme in grup
            </label>
            {maiMulteFirme && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={labelClass}>Nr. societati suplimentare</label>
                  <input type="number" value={nrSocietati} onChange={(e) => setNrSocietati(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nume societati suplimentare</label>
                  <input value={numeSocietati} onChange={(e) => setNumeSocietati(e.target.value)} className={inputClass} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className={labelClass}>Furnizor combustibil 1</label>
                <input value={combustibil1} onChange={(e) => setCombustibil1(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Furnizor combustibil 2</label>
                <input value={combustibil2} onChange={(e) => setCombustibil2(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Furnizor combustibil 3</label>
                <input value={combustibil3} onChange={(e) => setCombustibil3(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelClass}>Furnizor GPS 1</label>
                <input value={gps1} onChange={(e) => setGps1(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Furnizor GPS 2</label>
                <input value={gps2} onChange={(e) => setGps2(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Detalii suplimentare software</label>
              <textarea
                value={detaliiSoftware}
                onChange={(e) => setDetaliiSoftware(e.target.value)}
                rows={2}
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <InfoRow label="Solutia existenta" value={partner.solutia_existenta} />
            <InfoRow label="Client Novasoft" value={partner.client_novasoft ? "Da" : "Nu"} />
            <InfoRow label="Client Windsoft" value={partner.client_windsoft ? "Da" : "Nu"} />
            <InfoRow label="Contabilitate interna" value={partner.contabilitate_interna} />
            <InfoRow label="Solutie contabilitate" value={partner.solutie_contabilitate} />
            <InfoRow
              label="Mai multe firme in grup"
              value={
                partner.mai_multe_firme_grup
                  ? `Da (${partner.nr_societati_suplimentare ?? "?"}: ${partner.nume_societati_suplimentare ?? "—"})`
                  : "Nu"
              }
            />
            <InfoRow label="Potential fonduri europene" value={partner.potential_fonduri_europene ? "Da" : "Nu"} />
            <InfoRow
              label="Furnizori combustibil"
              value={[partner.furnizori_combustibil_1, partner.furnizori_combustibil_2, partner.furnizori_combustibil_3]
                .filter(Boolean)
                .join(", ")}
            />
            <InfoRow
              label="Furnizori GPS"
              value={[partner.furnizori_gps_1, partner.furnizori_gps_2].filter(Boolean).join(", ")}
            />
            <InfoRow label="Detalii software" value={partner.detalii_suplimentare_software} />
          </div>
        )}
      </div>

      {editing && (
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] hover:bg-[#FF4FAA] disabled:opacity-50"
          >
            <Check size={14} />
            {isPending ? "Se salveaza..." : "Salveaza"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-1"
          >
            <X size={14} />
            Anuleaza
          </button>
        </div>
      )}

      {/* Oportunitati legate */}
      <div className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Oportunitati legate ({partner.oportunitati.length})
        </p>
        {partner.oportunitati.length === 0 ? (
          <p className="text-sm text-text-muted">Nicio oportunitate legata inca.</p>
        ) : (
          <div className="space-y-1.5">
            {partner.oportunitati.map((o) => (
              <Link
                key={o.id}
                href={`/oportunitati/${o.id}`}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm transition hover:border-[#E8007A]"
              >
                <span className="text-text-primary">
                  {o.opportunity_code ? `${o.opportunity_code} - ` : ""}
                  {o.nume_potential}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {o.stage} · {o.status}
                  <ExternalLink size={12} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Contracte */}
      {contracte && (contracte.registru.length > 0 || contracte.generate.length > 0) && (
        <div className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Contracte ({contracte.registru.length + contracte.generate.length})
          </p>
          <div className="space-y-1.5">
            {contracte.registru.map((r) => (
              <Link
                key={r.id}
                href="/contracte/registru"
                className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm transition hover:border-[#E8007A]"
              >
                <span className="text-text-primary">
                  Nr. {r.nr_contract} {r.tip_document ? `· ${r.tip_document}` : ""}
                </span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {r.data_contract ?? "—"}
                  <ExternalLink size={12} />
                </span>
              </Link>
            ))}
            {contracte.generate.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
              >
                <span className="text-text-primary">Contract generat · {g.status}</span>
                <span className="flex items-center gap-2 text-xs text-text-muted">
                  {g.created_at.slice(0, 10)}
                  {g.downloadUrl && (
                    <a href={g.downloadUrl} download className="text-[#E8007A] hover:underline">
                      <Download size={13} />
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Istoric financiar */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Link
          href={`/creante?furnizor=${encodeURIComponent(partner.nume)}`}
          className="rounded-xl border border-border-subtle bg-surface-1 p-4 transition hover:border-[#E8007A]"
        >
          <p className="text-xs text-text-muted">Creante</p>
          <p className="text-xl font-semibold text-text-primary">{partner.nrCreante}</p>
        </Link>
        <Link
          href={`/obligatii?furnizor=${encodeURIComponent(partner.nume)}`}
          className="rounded-xl border border-border-subtle bg-surface-1 p-4 transition hover:border-[#E8007A]"
        >
          <p className="text-xs text-text-muted">Obligatii</p>
          <p className="text-xl font-semibold text-text-primary">{partner.nrObligatii}</p>
        </Link>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs text-text-muted">Linii venit</p>
          <p className="text-xl font-semibold text-text-primary">{partner.nrLiniiVenit}</p>
        </div>
      </div>
    </div>
  );
}
