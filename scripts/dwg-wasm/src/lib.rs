use acadrust::{DxfReader, DwgWriter, DxfVersion};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

// Both parsing and encoding run in browser memory; no files or network access.
#[wasm_bindgen]
pub fn encode_dwg(dxf: &[u8]) -> Result<Vec<u8>, JsValue> {
    let fail = |e: acadrust::error::DxfError| JsValue::from_str(&e.to_string());
    let mut doc = DxfReader::from_reader(Cursor::new(dxf.to_vec())).map_err(fail)?.read().map_err(fail)?;
    doc.version = DxfVersion::AC1032;
    doc.header.insertion_units = 4; // Millimetres.
    let text = String::from_utf8_lossy(dxf);
    let lines: Vec<&str> = text.lines().collect();
    doc.summary_info.comments = lines.chunks_exact(2)
        .filter(|pair| pair[0].trim() == "999")
        .map(|pair| pair[1]).collect::<Vec<_>>().join("\n");
    DwgWriter::write_to_vec(&doc).map_err(fail)
}
