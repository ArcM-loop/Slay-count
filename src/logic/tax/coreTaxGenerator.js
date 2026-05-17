/**
 * SLAYCOUNT CORETAX (SIAP) XML GENERATOR
 * Menghasilkan file XML sesuai skema Unifikasi & e-Faktur 4.0.
 */

export class CoreTaxGenerator {
  /**
   * Menghasilkan string XML untuk Bukti Potong Unifikasi (PPh 21, 23, 26, 4(2))
   */
  static generateUnifikasiXML(data, businessInfo) {
    const timestamp = new Date().toISOString();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<BupotUnifikasi xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
    
    // Header Info
    xml += `  <Header>\n`;
    xml += `    <NPWP_Pemotong>${businessInfo.npwp || '0000000000000000'}</NPWP_Pemotong>\n`;
    xml += `    <NITKU_Pemotong>${businessInfo.nitku || '000000'}</NITKU_Pemotong>\n`;
    xml += `    <Nama_Pemotong>${this.escapeXml(businessInfo.name)}</Nama_Pemotong>\n`;
    xml += `    <Timestamp>${timestamp}</Timestamp>\n`;
    xml += `  </Header>\n`;

    // Data Bukti Potong
    xml += `  <Detail>\n`;
    data.forEach((tx, index) => {
      xml += `    <BuktiPotong ID="${tx.id}">\n`;
      xml += `      <No_Bupot>${tx.ref_no || `BP-${index}`}</No_Bupot>\n`;
      xml += `      <Tgl_Bupot>${tx.date}</Tgl_Bupot>\n`;
      xml += `      <Objek_Pajak>${this.mapTaxCode(tx.tax_type)}</Objek_Pajak>\n`;
      xml += `      <Subjek_Pajak>\n`;
      xml += `        <Identitas>${tx.partner_npwp || 'NON-NPWP'}</Identitas>\n`;
      xml += `        <Nama>${this.escapeXml(tx.merchant_name)}</Nama>\n`;
      xml += `        <Alamat>${this.escapeXml(tx.partner_address || '-')}</Alamat>\n`;
      xml += `      </Subjek_Pajak>\n`;
      xml += `      <Nilai_Bruto>${tx.amount}</Nilai_Bruto>\n`;
      xml += `      <Tarif>${tx.tax_rate || 0}</Tarif>\n`;
      xml += `      <PPh_Dipotong>${tx.tax_amount}</PPh_Dipotong>\n`;
      xml += `    </BuktiPotong>\n`;
    });
    xml += `  </Detail>\n`;
    
    xml += `</BupotUnifikasi>`;
    
    return xml;
  }

  /**
   * Mapping Tax Type ke Kode Objek Pajak DJP (Sample)
   */
  static mapTaxCode(type) {
    const map = {
      'PPH_21': '21-100-01', // Pegawai Tetap
      'PPH_23_JASA': '24-104-01', // Jasa Teknik/Manajemen
      'PPH_26': '27-100-01', // Imbalan Jasa LN
      'PPH_4_2_SEWA': '28-403-01', // Sewa Tanah/Bangunan
    };
    return map[type] || '99-999-99';
  }

  static escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  static downloadXML(xmlContent, filename) {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Alias fungsi untuk generateCoreTaxXML (digunakan oleh EbupotExportButton).
 * Wrapper tipis di atas CoreTaxGenerator.generateUnifikasiXML
 */
export function generateCoreTaxXML(data, businessInfo) {
  return CoreTaxGenerator.generateUnifikasiXML(data, businessInfo);
}
