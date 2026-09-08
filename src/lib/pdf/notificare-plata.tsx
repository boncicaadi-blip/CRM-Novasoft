import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { NOVASOFT_LOGO_BASE64 } from "./assets/logo-data";

export interface FacturaNotificare {
  nr_factura: string;
  data_scadenta: string | null;
  total_factura: number;
  sold: number;
  zile_intarziere?: number;
}

export interface NotificarePlataData {
  numeClient: string;
  facturiRestante: FacturaNotificare[];
  facturiUrmatoare: FacturaNotificare[];
  soldTotal: number;
  dataDocument: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1A1A2E" },
  logo: { width: 160, marginBottom: 16 },
  expeditor: { fontSize: 10, fontWeight: 700, marginBottom: 18 },
  titlu: { fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: "center" },
  randInfo: { flexDirection: "row", marginBottom: 4 },
  randInfoLabel: { fontWeight: 700, width: 60 },
  paragraf: { marginBottom: 10, lineHeight: 1.5, textAlign: "justify" },
  sectiuneSoldTitlu: { fontSize: 11, fontWeight: 700, marginTop: 16, marginBottom: 4 },
  soldValoare: { fontSize: 18, fontWeight: 700, marginBottom: 14 },
  sectiuneTitlu: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  tabelHeader: {
    flexDirection: "row",
    backgroundColor: "#1A1A2E",
    color: "#FFFFFF",
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  tabelRand: {
    flexDirection: "row",
    padding: 6,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  tabelRandRestant: {
    flexDirection: "row",
    padding: 6,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    backgroundColor: "#FFF4F4",
  },
  col4: { width: "25%" },
  col3: { width: "33.33%" },
  colDreapta: { textAlign: "right" },
  colIntarziere: { color: "#DC2626" },
  semnatura: { marginTop: 20 },
  semnaturaLinie: { marginBottom: 2 },
});

function formatData(data: string | null): string {
  if (!data) return "—";
  const d = new Date(data);
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatSuma(valoare: number): string {
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valoare);
}

export function NotificarePlataDocument({ data }: { data: NotificarePlataData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={NOVASOFT_LOGO_BASE64} style={styles.logo} />
        <Text style={styles.expeditor}>NOVASOFT TECHNOLOGIES SRL</Text>

        <Text style={styles.titlu}>NOTIFICARE DE PLATA</Text>

        <View style={styles.randInfo}>
          <Text style={styles.randInfoLabel}>Data:</Text>
          <Text>{data.dataDocument}</Text>
        </View>
        <View style={styles.randInfo}>
          <Text style={styles.randInfoLabel}>Catre:</Text>
          <Text>{data.numeClient}</Text>
        </View>

        <Text style={[styles.paragraf, { marginTop: 14 }]}>Stimate partener,</Text>

        <Text style={styles.paragraf}>
          Va multumim pentru colaborarea cu Novasoft Technologies SRL.
        </Text>

        <Text style={styles.paragraf}>
          In urma verificarii situatiei financiare aferente contractelor si serviciilor active, va transmitem mai jos
          situatia facturilor inregistrate in evidentele noastre la data prezentei notificari.
        </Text>

        <Text style={styles.sectiuneSoldTitlu}>SOLD TOTAL DE ACHITAT</Text>
        <Text style={styles.soldValoare}>{formatSuma(data.soldTotal)} RON</Text>

        {data.facturiRestante.length > 0 && (
          <>
            <Text style={styles.sectiuneTitlu}>Facturi cu termenul de plata depasit</Text>
            <View style={styles.tabelHeader}>
              <Text style={styles.col4}>Factura</Text>
              <Text style={styles.col4}>Data scadentei</Text>
              <Text style={[styles.col4, styles.colDreapta]}>Sold de achitat</Text>
              <Text style={[styles.col4, styles.colDreapta]}>Intarziere</Text>
            </View>
            {data.facturiRestante.map((f) => (
              <View key={f.nr_factura} style={styles.tabelRandRestant}>
                <Text style={styles.col4}>{f.nr_factura}</Text>
                <Text style={styles.col4}>{formatData(f.data_scadenta)}</Text>
                <Text style={[styles.col4, styles.colDreapta]}>{formatSuma(f.sold)} RON</Text>
                <Text style={[styles.col4, styles.colDreapta, styles.colIntarziere]}>{f.zile_intarziere ?? 0} zile</Text>
              </View>
            ))}
            <Text style={styles.paragraf}>
              Va rugam sa aveti in vedere achitarea cu prioritate a facturilor pentru care termenul de plata a fost
              depasit.
            </Text>
          </>
        )}

        {data.facturiUrmatoare.length > 0 && (
          <>
            <Text style={styles.sectiuneTitlu}>Facturi care urmeaza la scadenta</Text>
            <View style={styles.tabelHeader}>
              <Text style={styles.col3}>Factura</Text>
              <Text style={styles.col3}>Data scadentei</Text>
              <Text style={[styles.col3, styles.colDreapta]}>Sold de achitat</Text>
            </View>
            {data.facturiUrmatoare.map((f) => (
              <View key={f.nr_factura} style={styles.tabelRand}>
                <Text style={styles.col3}>{f.nr_factura}</Text>
                <Text style={styles.col3}>{formatData(f.data_scadenta)}</Text>
                <Text style={[styles.col3, styles.colDreapta]}>{formatSuma(f.sold)} RON</Text>
              </View>
            ))}
            <Text style={styles.paragraf}>
              Pentru mentinerea unei situatii financiare la zi si pentru derularea in bune conditii a serviciilor
              contractate, va rugam sa aveti in vedere termenele de plata mentionate mai sus.
            </Text>
          </>
        )}

        <Text style={styles.paragraf}>
          In cazul in care plata uneia dintre facturile prezentate a fost deja efectuata, va rugam sa considerati
          notificarea aferenta acesteia fara obiect si, daca este posibil, sa ne transmiteti dovada platii pentru
          actualizarea rapida a evidentelor noastre.
        </Text>

        <Text style={styles.paragraf}>
          Pentru orice neclaritate privind situatia facturilor sau pentru reconcilierea soldului, va rugam sa ne
          contactati.
        </Text>

        <Text style={styles.paragraf}>Va multumim pentru colaborare si pentru respectarea termenelor de plata.</Text>

        <View style={styles.semnatura}>
          <Text style={styles.semnaturaLinie}>Cu stima,</Text>
          <Text style={styles.semnaturaLinie}>Echipa Novasoft Technologies SRL</Text>
        </View>
      </Page>
    </Document>
  );
}
