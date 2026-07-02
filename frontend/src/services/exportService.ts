function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateMockCsv(): string {
  const headers =
    "Fecha inicio ciclo,Fecha fin ciclo,Duración,Fecha registro,Nivel flujo,Temperatura,Síntoma,Intensidad,Notas\n";

  const rows = [
    "2026-06-27,,4,2026-06-27,Medio,36.5,Dolor abdominal,4,\n",
    "2026-06-27,,4,2026-06-28,Leve,,Fatiga,3,Algo cansada\n",
    "2026-06-27,,4,2026-06-29,Ninguno,,Irritabilidad,2,\n",
    "2026-05-29,2026-06-02,5,2026-05-30,Medio,36.7,Dolor abdominal,5,\n",
    "2026-05-29,2026-06-02,5,2026-05-31,Alto,36.4,Dolor de cabeza,3,Mucho dolor\n",
    "2026-04-30,2026-05-04,5,2026-05-01,Leve,,Hinchazón,2,\n",
  ];

  return headers + rows.join("");
}

export async function downloadCSV(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  const today = new Date().toISOString().split("T")[0];
  const content = generateMockCsv();
  downloadFile(
    "\uFEFF" + content,
    `eva_datos_${today}.csv`,
    "text/csv; charset=utf-8",
  );
}

export async function downloadPDF(cyclesBack: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const today = new Date().toISOString().split("T")[0];
  const content = `%PDF-1.4 fake pdf content for ${cyclesBack} cycles`;
  downloadFile(content, `eva_informe_${today}.pdf`, "application/pdf");
}
