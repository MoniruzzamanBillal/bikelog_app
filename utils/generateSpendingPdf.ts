import { TSpendingDetails, TSpendingRecord } from "@/types/spending.types";
import { format } from "date-fns";
import { formatApiDate } from "@/utils/formatApiDate";
import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

function buildFilename(details: TSpendingDetails): string {
  if (details.period === "month") return `spending-month-${details.targetMonth}.pdf`;
  if (details.period === "year") return `spending-year-${details.targetYear}.pdf`;
  return "spending-lifetime.pdf";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function recordRow(record: TSpendingRecord): string {
  return `
    <tr>
      <td>${formatApiDate(record.date, "d MMM yyyy")}</td>
      <td>${escapeHtml(record.category)}</td>
      <td>${escapeHtml(record.description)}</td>
      <td>৳${record.amount.toFixed(2)}</td>
      <td>${record.vendor ? escapeHtml(record.vendor) : "-"}</td>
      <td>${record.remarks ? escapeHtml(record.remarks) : "-"}</td>
    </tr>`;
}

function buildHtml(details: TSpendingDetails, periodLabel: string): string {
  const generatedAt = format(new Date(), "d MMM yyyy, h:mm a");

  const categoryRows = details.categoryBreakdown
    .map(
      (cat) => `
    <tr>
      <td>${escapeHtml(cat.category)}</td>
      <td>৳${cat.total.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const lineItemsSection =
    details.records.length > 0
      ? `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Description</th>
          <th>Amount (৳)</th>
          <th>Vendor</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${details.records.map(recordRow).join("")}
      </tbody>
    </table>`
      : `<p class="empty">No spending records for this period.</p>`;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Roboto, sans-serif; color: #212121; padding: 24px; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      .subtitle { font-size: 13px; color: #757575; margin: 2px 0; }
      .total { font-size: 18px; font-weight: 600; margin: 20px 0 12px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; }
      th { background: #f5f5f5; font-weight: 600; }
      .empty { font-size: 13px; color: #757575; }
    </style>
  </head>
  <body>
    <h1>Spending Report</h1>
    <p class="subtitle">${escapeHtml(periodLabel)}</p>
    <p class="subtitle">Generated ${generatedAt}</p>

    <p class="total">Total Spending: ৳${details.totalSpending.toFixed(2)}</p>

    <table>
      <thead>
        <tr><th>Category</th><th>Total (৳)</th></tr>
      </thead>
      <tbody>
        ${categoryRows}
      </tbody>
    </table>

    ${lineItemsSection}
  </body>
</html>`;
}

export async function generateSpendingPdf(
  details: TSpendingDetails,
  periodLabel: string,
): Promise<void> {
  const html = buildHtml(details, periodLabel);
  const { uri } = await Print.printToFileAsync({ html });

  const generatedFile = new File(uri);
  const destination = new File(Paths.cache, buildFilename(details));
  if (destination.exists) destination.delete();
  generatedFile.copy(destination);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing isn't available on this device.");
  }

  await Sharing.shareAsync(destination.uri, {
    mimeType: "application/pdf",
    dialogTitle: "Export Spending Report",
    UTI: "com.adobe.pdf",
  });
}
