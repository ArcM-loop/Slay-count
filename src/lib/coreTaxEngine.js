/**
 * CoreTax XML Engine for SlayCount
 * Standar Integrasi Portal DJP CoreTax (SIAP) 2024-2025
 */

export const generateCoreTaxXML = (transaction, businessProfile) => {
  const { seller, buyer, items, header } = transaction;

  // Helper untuk format angka sesuai standar DJP (2 desimal)
  const f = (num) => Number(num || 0).toFixed(2);

  // Konstruksi XML string
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<FakturPajak>\n`;
  
  // 1. Header Transaksi
  xml += `  <Header>\n`;
  xml += `    <KodeFaktur>${header.kodeFaktur || '010'}</KodeFaktur>\n`;
  xml += `    <NomorFaktur>${header.nomorFaktur || ''}</NomorFaktur>\n`;
  xml += `    <TanggalFaktur>${header.tanggalFaktur}</TanggalFaktur>\n`; // Format: YYYY-MM-DD
  xml += `    <MasaPajak>${header.masaPajak}</MasaPajak>\n`;
  xml += `    <TahunPajak>${header.tahunPajak}</TahunPajak>\n`;
  xml += `    <StatusFaktur>0</StatusFaktur>\n`; // 0 = Normal, 1 = Pengganti
  xml += `  </Header>\n`;

  // 2. Data Penjual (Owner Bisnis)
  xml += `  <Penjual>\n`;
  xml += `    <NPWP16>${businessProfile.npwp16}</NPWP16>\n`;
  xml += `    <NITKU>${businessProfile.nitku || '000000'}</NITKU>\n`;
  xml += `    <Nama>${businessProfile.name}</Nama>\n`;
  xml += `    <Alamat>${businessProfile.address}</Alamat>\n`;
  xml += `  </Penjual>\n`;

  // 3. Data Lawan Transaksi (Buyer)
  xml += `  <LawanTransaksi>\n`;
  xml += `    <NPWP16>${buyer.npwp16 || '0000000000000000'}</NPWP16>\n`;
  xml += `    <NITKU>${buyer.nitku || '000000'}</NITKU>\n`;
  xml += `    <Nama>${buyer.name}</Nama>\n`;
  xml += `    <Alamat>${buyer.address}</Alamat>\n`;
  xml += `  </LawanTransaksi>\n`;

  // 4. Daftar Barang dan Jasa
  xml += `  <DaftarBarangJasa>\n`;
  let totalDpp = 0;
  let totalPpn = 0;

  items.forEach((item, index) => {
    const dpp = item.price * item.quantity;
    const ppn = dpp * 0.11;
    totalDpp += dpp;
    totalPpn += ppn;

    xml += `    <BarangJasa>\n`;
    xml += `      <Nama>${item.name}</Nama>\n`;
    xml += `      <HargaSatuan>${f(item.price)}</HargaSatuan>\n`;
    xml += `      <JumlahBarang>${item.quantity}</JumlahBarang>\n`;
    xml += `      <HargaTotal>${f(dpp)}</HargaTotal>\n`;
    xml += `      <Diskon>0.00</Diskon>\n`;
    xml += `      <DPP>${f(dpp)}</DPP>\n`;
    xml += `      <PPN>${f(ppn)}</PPN>\n`;
    xml += `      <TarifPPN>0.11</TarifPPN>\n`;
    xml += `    </BarangJasa>\n`;
  });
  xml += `  </DaftarBarangJasa>\n`;

  // 5. Total Akumulasi
  xml += `  <Summary>\n`;
  xml += `    <TotalDPP>${f(totalDpp)}</TotalDPP>\n`;
  xml += `    <TotalPPN>${f(totalPpn)}</TotalPPN>\n`;
  xml += `    <TotalPPnBM>0.00</TotalPPnBM>\n`;
  xml += `    <JumlahBayar>${f(totalDpp + totalPpn)}</JumlahBayar>\n`;
  xml += `  </Summary>\n`;

  xml += `</FakturPajak>`;

  return xml;
};

/**
 * Download XML Helper
 */
export const downloadCoreTaxXML = (xmlContent, filename) => {
  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
