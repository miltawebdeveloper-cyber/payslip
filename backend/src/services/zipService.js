const zlib = require('zlib');

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/**
 * Packs `{ name, data }` buffers into a ZIP archive using the STORE method.
 * PDFs are already compressed internally, so deflating them again gains next
 * to nothing — storing keeps this small and dependency-free. Fine for any
 * realistic payroll run (no ZIP64, so < 65,535 files and < 4 GB).
 */
function createZip(files) {
  const { time, day } = dosDateTime(new Date());
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = zlib.crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 file names
    local.writeUInt16LE(0, 8); // compression: store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra field length

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed to extract
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    // Extra/comment lengths, disk number and attributes (30–41) stay zero.
    central.writeUInt32LE(offset, 42); // offset of the local header

    localParts.push(local, nameBuf, data);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(files.length, 8); // entries on this disk
  end.writeUInt16LE(files.length, 10); // total entries
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16); // central directory offset

  return Buffer.concat([...localParts, centralDirectory, end]);
}

module.exports = { createZip };
