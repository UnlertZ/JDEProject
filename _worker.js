/**
 * _worker.js — Universal Gateway สำหรับ Cloudflare Workers & Pages
 * Self-contained 100% พร้อมระบบ Auto-Create Tables & Auto-Seed Cloudflare D1
 */

// ─── ฐานข้อมูลถังเริ่มต้น 116 ถัง (สำหรับ Auto-seed อัตโนมัติเมื่อ D1 ว่าง) ───
const INITIAL_TANKS = [
  {
    "FireTank": "EX01",
    "Types": "Low-pressure water formula",
    "Weight (lb)": 10,
    "Area": "Solar WH",
    "Inuse": "01/01/2022",
    "Lastcheck": "2026-09-29 17:57",
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": "Ready",
    "TankStatus": true,
    "Exptank": "4ปี",
    "PicTank": "uploads/tanks/EX01_PicTank_QRCode_JDE_Peets_scml.png",
    "PicArea": null,
    "Inspector": "Jort"
  },
  {
    "FireTank": "EX02",
    "Types": "Dry Chemical",
    "Weight (lb)": 20,
    "Area": "LPG station",
    "Inuse": null,
    "Lastcheck": "2026-09-29 18:38",
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": "Ready",
    "TankStatus": true,
    "Exptank": null,
    "PicTank": "uploads/tanks/EX02_PicTank_QRCode_JDE_Peets_scml.png",
    "PicArea": null,
    "Inspector": "Jort"
  },
  {
    "FireTank": "EX03",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Checker (Production)",
    "Inuse": "01/01/2012",
    "Lastcheck": "2026-09-29 16:10",
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": "Ready",
    "TankStatus": true,
    "Exptank": "14ปี",
    "PicTank": "uploads/tanks/EX03_PicTank_QRCode_JDE_Peets_scml.png",
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX04",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Equipment Washing Room",
    "Inuse": "01/01/2013",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "13ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX05",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Hot work (in)",
    "Inuse": "01/01/2016",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "10ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX06",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Hot work",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX07",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Washroom PD2",
    "Inuse": "01/01/2017",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "9ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX08",
    "Types": "Dry Chemical",
    "Weight (lb)": 20,
    "Area": "Rework PD1",
    "Inuse": "01/01/2005",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "21ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX09",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "Hazardous waste point PD1",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX10",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "SAP PD1",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX11",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "MDB2",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX12",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 20,
    "Area": "MDB2 (in)",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX13",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "Canteen",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX14",
    "Types": "Low-pressure water formula",
    "Weight (lb)": 10,
    "Area": "Office 2nd Floor",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX15",
    "Types": "Low-pressure water formula",
    "Weight (lb)": 10,
    "Area": "Office 2nd Floor",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX16",
    "Types": "Dry Chemical",
    "Weight (lb)": 20,
    "Area": "Document room 3rd Floor",
    "Inuse": "01/01/2006",
    "Lastcheck": "2026-09-29 17:54",
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": "Ready",
    "TankStatus": true,
    "Exptank": "20ปี",
    "PicTank": "uploads/tanks/EX16_PicTank_QRCode_JDE_Peets_scml.png",
    "PicArea": null,
    "Inspector": "Jort"
  },
  {
    "FireTank": "EX17",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "3rd Floor",
    "Inuse": "01/01/2021",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "5ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX18",
    "Types": "CO2",
    "Weight (lb)": 0,
    "Area": "AHU 3rd Floor",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX19",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH ",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX20",
    "Types": "Low-pressure water formula",
    "Weight (lb)": 10,
    "Area": "WH gennerator solar",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX21",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH ",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX22",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH ",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX23",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH ",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX24",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH ",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX25",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH Bluk loading",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX26",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX27",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX28",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX29",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX30",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX31",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX32",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX33",
    "Types": "Dry Chemical",
    "Weight (lb)": 0,
    "Area": "WH (Construction zone)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX34",
    "Types": "Dry Chemical",
    "Weight (lb)": 20,
    "Area": "Charging station WH",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX35",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 15,
    "Area": "Charging station WH",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX36",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 15,
    "Area": "Charging station WH",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX37",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH loading",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX38",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH loading",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX39",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH loading",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX40",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH (Construction zone)",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX41",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH (Construction zone)",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX42",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH (Construction zone)",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX43",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "WH (Construction zone)",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX44",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX45",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX46",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX47",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX48",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX49",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX50",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX51",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Pack",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX52",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Mix",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX53",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Mix",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX54",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Mix",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX55",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Mix",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX56",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 1 Mix",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX57",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX58",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX59",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX60",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX61",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX62",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX63",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX64",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX65",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2009",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "17ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX66",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2006",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "20ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX67",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX68",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX69",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX70",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX71",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX72",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Mix",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX73",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX74",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX75",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX76",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX77",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX78",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX79",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX80",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2018",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX81",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2019",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "7ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX82",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "PD 2 Pack",
    "Inuse": "01/01/2017",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "9ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX83",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "AHU 3rd Floor",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX84",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "AHU 3rd Floor",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX85",
    "Types": "Dry Chemical",
    "Weight (lb)": 15,
    "Area": "Smoking room",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX86",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 15,
    "Area": "Charging station AGV PD1",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX87",
    "Types": "CO2",
    "Weight (lb)": 0,
    "Area": "Remove",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX88",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": null,
    "Area": "Emergency eyewash station Behind Building 1 (UT)",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX89",
    "Types": "Low-pressure water formula",
    "Weight (lb)": 10,
    "Area": "First Aid Room",
    "Inuse": "01/01/2025",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "1ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX90",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Public Relations Board (HR)",
    "Inuse": "01/01/2022",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "4ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX91",
    "Types": "Low-pressure water formula",
    "Weight (lb)": 10,
    "Area": "Office 1st Floor",
    "Inuse": "01/01/2025",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "1ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX92",
    "Types": "Low-pressure water formula",
    "Weight (lb)": 10,
    "Area": "Male toilet (Emp)",
    "Inuse": "01/01/2025",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "1ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX93",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Male locker room",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX94",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Washroom PD1",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX95",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Female locker room",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX96",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Training Room",
    "Inuse": "01/01/2024",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "2ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX97",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Training Room",
    "Inuse": "01/01/2025",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "1ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX98",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Doddy PD1 ",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX99",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Doddy PD1 ",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX100",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "End of line PD2",
    "Inuse": "01/01/2004",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "22ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX101",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "Waste compactor building 1",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX102",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "Fire Pump Room building 1",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX103",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "Transformer building 1 room ",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX104",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "Transformer building 1 room ",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX105",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Garbage House",
    "Inuse": null,
    "Lastcheck": "2026-09-29 17:45",
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": "Ready",
    "TankStatus": true,
    "Exptank": null,
    "PicTank": "uploads/tanks/EX105_PicTank_QRCode_JDE_Peets_scml.png",
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX106",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Garbage House",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX107",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "Fire Pump Room building 2",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX108",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "AHU",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX109",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "AHU",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX110",
    "Types": "Halocarbon Clean Agent",
    "Weight (lb)": 10,
    "Area": "Air Com ",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX111",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Dust Collector Room PD1",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX112",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Generator room building 2",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX113",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Security guard",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX114",
    "Types": "Dry Chemical",
    "Weight (lb)": 10,
    "Area": "Spare Parts Room",
    "Inuse": null,
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": null,
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "EX115",
    "Types": "CO2",
    "Weight (lb)": 10,
    "Area": "Cold room building 1",
    "Inuse": "01/01/2018",
    "Lastcheck": "2026-09-29 16:17",
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": "Ready",
    "TankStatus": true,
    "Exptank": "8ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  },
  {
    "FireTank": "Ex116",
    "Types": null,
    "Weight (lb)": null,
    "Area": null,
    "Inuse": "01/01/2021",
    "Lastcheck": 2026,
    "Tankcheck": "เช็คแล้ว",
    "ReadyorNot": null,
    "TankStatus": true,
    "Exptank": "5ปี",
    "PicTank": null,
    "PicArea": null,
    "Inspector": null
  }
];

function getDaysSinceCheck(lastcheckVal) {
  if (!lastcheckVal) return null;
  const s = String(lastcheckVal).trim();
  if (!s) return null;

  let checkDate = null;
  if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.test(s)) {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const y = parseInt(m[3], 10);
      const h = m[4] ? parseInt(m[4], 10) : 0;
      const mi = m[5] ? parseInt(m[5], 10) : 0;
      checkDate = new Date(y, mo, d, h, mi);
    }
  } else if (/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.test(s)) {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const h = m[4] ? parseInt(m[4], 10) : 0;
      const mi = m[5] ? parseInt(m[5], 10) : 0;
      checkDate = new Date(y, mo, d, h, mi);
    }
  }

  if (!checkDate || isNaN(checkDate.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - checkDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatTankResponse(row) {
  if (!row) return {};

  const get = (key) => {
    if (row[key] !== undefined && row[key] !== null) return row[key];
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const k of Object.keys(row)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey) {
        if (row[k] !== undefined && row[k] !== null) return row[k];
      }
    }
    return '';
  };

  const fireTank = get('fire_tank') || get('FireTank') || '';
  const lastcheck = get('lastcheck') || get('Lastcheck') || '';
  let tankCheck = get('tankcheck') || get('Tankcheck') || 'ยังไม่เช็ค';

  if (tankCheck === 'เช็คแล้ว') {
    const days = getDaysSinceCheck(lastcheck);
    if (days !== null && days >= 30) {
      tankCheck = 'ยังไม่เช็ค';
    }
  }

  const readyOrNot = get('ready_or_not') || get('ReadyorNot') || 'Not Ready';
  const tankStatusVal = get('tank_status') ?? get('TankStatus');
  const tankStatus = (tankStatusVal !== '' && tankStatusVal !== undefined)
    ? Boolean(tankStatusVal)
    : (readyOrNot === 'Ready');

  let weightVal = get('weight') || get('Weight (lb)') || get('Weight');
  if (weightVal !== '' && weightVal !== null && !isNaN(weightVal)) {
    weightVal = parseFloat(weightVal);
  } else {
    weightVal = null;
  }

  return {
    FireTank: String(fireTank).trim(),
    Types: String(get('types') || get('Types') || ''),
    'Weight (lb)': weightVal,
    Area: String(get('area') || get('Area') || ''),
    Inuse: String(get('inuse') || get('Inuse') || ''),
    Lastcheck: lastcheck ? String(lastcheck) : '',
    Tankcheck: tankCheck,
    ReadyorNot: readyOrNot,
    TankStatus: tankStatus,
    Exptank: String(get('exptank') || get('Exptank') || ''),
    PicTank: get('pic_tank') || get('PicTank') || null,
    PicArea: get('pic_area') || get('PicArea') || null,
    Inspector: String(get('inspector') || get('Inspector') || ''),
    Responsible: String(get('responsible') || get('Responsible') || ''),
    Remark: String(get('remark') || get('Remark') || '')
  };
}

let _dbInitialized = false;

async function ensureDatabase(db) {
  if (_dbInitialized || !db) return;
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT,
        rank TEXT DEFAULT 'P1',
        permit_do INTEGER DEFAULT 1,
        em_name TEXT
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS pending_users (
        username TEXT PRIMARY KEY,
        password TEXT,
        em_name TEXT,
        rank TEXT DEFAULT 'P1',
        permit_do INTEGER DEFAULT 1,
        registered_at TEXT
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS tanks (
        fire_tank TEXT PRIMARY KEY,
        types TEXT,
        weight REAL,
        area TEXT,
        inuse TEXT,
        lastcheck TEXT,
        tankcheck TEXT DEFAULT 'ยังไม่เช็ค',
        ready_or_not TEXT DEFAULT 'Not Ready',
        tank_status INTEGER DEFAULT 0,
        exptank TEXT,
        pic_tank TEXT,
        pic_area TEXT,
        inspector TEXT,
        responsible TEXT,
        remark TEXT
      )
    `).run();

    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    if (!userCount || userCount.count === 0) {
      await db.prepare(`
        INSERT OR REPLACE INTO users (username, password, rank, permit_do, em_name) VALUES
        ('johporadmin', 'Admin0123456789', 'P3', 3, 'Administrator'),
        ('LeaderLinePD1', 'PD1', 'P1', 1, 'Jort')
      `).run();
    }

    const tankCount = await db.prepare('SELECT COUNT(*) as count FROM tanks').first();
    if (!tankCount || tankCount.count === 0) {
      await seedInitialTanks(db);
    }

    _dbInitialized = true;
  } catch (err) {
    console.error('ensureDatabase error:', err);
  }
}

async function seedInitialTanks(db) {
  if (!db || !Array.isArray(INITIAL_TANKS) || INITIAL_TANKS.length === 0) return;
  const batchSize = 40;
  for (let i = 0; i < INITIAL_TANKS.length; i += batchSize) {
    const chunk = INITIAL_TANKS.slice(i, i + batchSize);
    const statements = chunk.map(t => {
      const tankId = String(t.FireTank || t.fire_tank || '').trim().toUpperCase();
      const weightVal = t['Weight (lb)'] ?? t.weight ?? null;
      const weightNum = (weightVal !== null && weightVal !== '' && !isNaN(weightVal)) ? parseFloat(weightVal) : null;
      const isReady = t.ReadyorNot === 'Ready' || t.ready_or_not === 'Ready';
      const tankStatus = (t.TankStatus === true || t.tank_status === 1 || isReady) ? 1 : 0;
      const lastCheck = t.Lastcheck ? String(t.Lastcheck) : '';

      return db.prepare(`
        INSERT OR REPLACE INTO tanks (
          fire_tank, types, weight, area, inuse, lastcheck, tankcheck,
          ready_or_not, tank_status, exptank, pic_tank, pic_area,
          inspector, responsible, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        tankId,
        t.Types || t.types || '',
        weightNum,
        t.Area || t.area || '',
        t.Inuse || t.inuse || '',
        lastCheck,
        t.Tankcheck || t.tankcheck || 'ยังไม่เช็ค',
        t.ReadyorNot || t.ready_or_not || (isReady ? 'Ready' : 'Not Ready'),
        tankStatus,
        t.Exptank || t.exptank || '',
        t.PicTank || t.pic_tank || null,
        t.PicArea || t.pic_area || null,
        t.Inspector || t.inspector || '',
        t.Responsible || t.responsible || '',
        t.Remark || t.remark || ''
      );
    });
    await db.batch(statements);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();

    // ─── API Routes ───
    try {
      if (!env.DB && pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Cloudflare D1 binding "DB" is not configured in env'
        }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      }

      // Auto-ensure DB tables exist for all API calls
      if (env.DB && pathname.startsWith('/api/')) {
        await ensureDatabase(env.DB);
      }

      // 1. /api/auth
      if (pathname === '/api/auth') {
        if (method === 'POST') {
          const { username, password } = await request.json();
          const uTrim = String(username || '').trim().toLowerCase();
          const pTrim = String(password || '').trim();

          const pending = await env.DB.prepare(
            'SELECT username FROM pending_users WHERE LOWER(username) = ?'
          ).bind(uTrim).first();

          if (pending) {
            return new Response(JSON.stringify({
              success: false,
              message: '⚠️ บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบ (Admin) อนุมัติ กรุณารอการตรวจสอบ'
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
          }

          let user = await env.DB.prepare(
            'SELECT username, password, rank, permit_do, em_name FROM users WHERE LOWER(username) = ?'
          ).bind(uTrim).first();

          // Auto-seed johporadmin
          if (!user && uTrim === 'johporadmin' && pTrim === 'Admin0123456789') {
            try {
              await env.DB.prepare(
                'INSERT OR REPLACE INTO users (username, password, rank, permit_do, em_name) VALUES (?, ?, ?, ?, ?)'
              ).bind('johporadmin', 'Admin0123456789', 'P3', 3, 'Administrator').run();
              user = {
                username: 'johporadmin',
                password: 'Admin0123456789',
                rank: 'P3',
                permit_do: 3,
                em_name: 'Administrator'
              };
            } catch (e) {}
          }

          if (user && user.password === pTrim) {
            return new Response(JSON.stringify({
              success: true,
              user: {
                Username: user.username,
                Rank: user.rank,
                PermitDo: user.permit_do,
                EmName: user.em_name
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          return new Response(JSON.stringify({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }), {
            status: 401, headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // 2. /api/check
      if (pathname === '/api/check') {
        if (method === 'POST') {
          const body = await request.json();
          const tankId = String(body.FireTank || '').trim().toUpperCase();
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });

          const tank = await env.DB.prepare('SELECT inuse FROM tanks WHERE UPPER(fire_tank) = ?').bind(tankId).first();
          if (!tank) return new Response(JSON.stringify({ success: false, message: 'ไม่พบถังที่ระบุ' }), { status: 404 });

          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const mins = String(now.getMinutes()).padStart(2, '0');
          const timeStr = `${year}-${month}-${day} ${hours}:${mins}`;

          let exptank = '';
          if (tank.inuse) {
            const match = String(tank.inuse).match(/\d{4}/);
            if (match) {
              const inuseYear = parseInt(match[0], 10);
              const diff = Math.max(0, year - inuseYear);
              exptank = `${diff}ปี`;
            }
          }

          const isReady = Boolean(body.isReady);
          const weightVal = body.weight ? parseFloat(body.weight) : null;
          const inspectorName = body.inspector || '';
          const newPic = body.newPic || null;
          const remark = body.remark || '';

          await env.DB.prepare(`
            UPDATE tanks
            SET lastcheck = ?, tankcheck = 'เช็คแล้ว', ready_or_not = ?, tank_status = ?,
                exptank = ?, inspector = ?, weight = COALESCE(?, weight),
                pic_tank = COALESCE(?, pic_tank), remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(timeStr, isReady ? 'Ready' : 'Not Ready', isReady ? 1 : 0, exptank, inspectorName, weightVal, newPic, remark, tankId).run();

          return new Response(JSON.stringify({
            success: true,
            data: { lastcheck: timeStr, exptank: exptank, ready_or_not: isReady ? 'Ready' : 'Not Ready' }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 3. /api/register
      if (pathname === '/api/register') {
        if (method === 'POST') {
          const { username, password, emName } = await request.json();
          const uTrim = String(username || '').trim().toLowerCase();
          const pTrim = String(password || '').trim();
          const nameTrim = String(emName || '').trim();

          if (!uTrim || !pTrim || !nameTrim) return new Response(JSON.stringify({ success: false, message: 'กรุณากรอกข้อมูลให้ครบ' }), { status: 400 });

          const existingUser = await env.DB.prepare('SELECT username FROM users WHERE LOWER(username) = ?').bind(uTrim).first();
          if (existingUser) return new Response(JSON.stringify({ success: false, message: `ชื่อผู้ใช้ "${uTrim}" มีอยู่ในระบบแล้ว` }), { status: 409 });

          const existingPending = await env.DB.prepare('SELECT username FROM pending_users WHERE LOWER(username) = ?').bind(uTrim).first();
          if (existingPending) return new Response(JSON.stringify({ success: false, message: `ชื่อผู้ใช้ "${uTrim}" อยู่ระหว่างรอการอนุมัติแล้ว` }), { status: 409 });

          const now = new Date();
          const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

          await env.DB.prepare(`
            INSERT INTO pending_users (username, password, em_name, rank, permit_do, registered_at)
            VALUES (?, ?, ?, 'P1', 1, ?)
          `).bind(uTrim, pTrim, nameTrim, dateStr).run();

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 4. /api/seed
      if (pathname === '/api/seed') {
        await env.DB.prepare(`
          INSERT OR REPLACE INTO users (username, password, rank, permit_do, em_name) VALUES
          ('johporadmin', 'Admin0123456789', 'P3', 3, 'Administrator'),
          ('LeaderLinePD1', 'PD1', 'P1', 1, 'Jort')
        `).run();

        const force = url.searchParams.get('force') === 'true' || method === 'POST';
        if (force) {
          await seedInitialTanks(env.DB);
        }

        const countRes = await env.DB.prepare('SELECT COUNT(*) as count FROM tanks').first();
        return new Response(JSON.stringify({
          success: true,
          message: '✅ Seed สำเร็จ',
          tanksCount: countRes ? countRes.count : 0,
          loginInfo: {
            username: 'johporadmin',
            password: 'Admin0123456789',
            rank: 'P3'
          }
        }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      // 5. /api/tanks
      if (pathname === '/api/tanks') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM tanks').all();
          const formatted = (results || []).map(formatTankResponse);
          formatted.sort((a, b) => (a.FireTank || '').localeCompare(b.FireTank || '', undefined, { numeric: true, sensitivity: 'base' }));
          return new Response(JSON.stringify(formatted), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }

        if (method === 'POST') {
          const body = await request.json();
          const tankId = String(body.FireTank || '').trim().toUpperCase();
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });

          const existing = await env.DB.prepare('SELECT fire_tank FROM tanks WHERE UPPER(fire_tank) = ?').bind(tankId).first();
          if (existing) return new Response(JSON.stringify({ success: false, message: `รหัสถัง "${tankId}" มีอยู่แล้ว` }), { status: 400 });

          const weightVal = body['Weight (lb)'] ? parseFloat(body['Weight (lb)']) : null;
          const isReady = body.ReadyorNot === 'Ready';

          await env.DB.prepare(`
            INSERT INTO tanks (fire_tank, types, weight, area, inuse, lastcheck, tankcheck, ready_or_not, tank_status, exptank, pic_tank, pic_area, inspector, responsible, remark)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(tankId, body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', body.PicTank || null, body.PicArea || null, body.Inspector || '', body.Responsible || '', body.Remark || '').run();

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'PUT') {
          const body = await request.json();
          const tankId = String(body.FireTank || '').trim().toUpperCase();
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });

          const weightVal = body['Weight (lb)'] ? parseFloat(body['Weight (lb)']) : null;
          const isReady = body.ReadyorNot === 'Ready';

          await env.DB.prepare(`
            UPDATE tanks
            SET types = ?, weight = ?, area = ?, inuse = ?, lastcheck = ?,
                tankcheck = ?, ready_or_not = ?, tank_status = ?, exptank = ?,
                pic_tank = COALESCE(?, pic_tank), pic_area = COALESCE(?, pic_area),
                inspector = ?, responsible = ?, remark = ?
            WHERE UPPER(fire_tank) = ?
          `).bind(body.Types || '', weightVal, body.Area || '', body.Inuse || '', body.Lastcheck || '', body.Tankcheck || 'ยังไม่เช็ค', body.ReadyorNot || 'Not Ready', isReady ? 1 : 0, body.Exptank || '', body.PicTank || null, body.PicArea || null, body.Inspector || '', body.Responsible || '', body.Remark || '', tankId).run();

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'DELETE') {
          const tankId = url.searchParams.get('id');
          if (!tankId) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุรหัสถัง' }), { status: 400 });
          await env.DB.prepare('DELETE FROM tanks WHERE UPPER(fire_tank) = ?').bind(tankId.toUpperCase()).run();
          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 6. /api/approvals
      if (pathname === '/api/approvals') {
        if (method === 'GET') {
          const pendingQuery = await env.DB.prepare('SELECT username as Username, em_name as EmName, rank as Rank, permit_do as PermitDo, registered_at as RegisteredAt FROM pending_users').all();
          const usersQuery = await env.DB.prepare('SELECT username as Username, em_name as EmName, rank as Rank, permit_do as PermitDo FROM users').all();
          return new Response(JSON.stringify({ pending: pendingQuery.results || [], users: usersQuery.results || [] }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'POST') {
          const { username } = await request.json();
          const uTrim = String(username || '').trim();
          const pending = await env.DB.prepare('SELECT * FROM pending_users WHERE LOWER(username) = ?').bind(uTrim.toLowerCase()).first();
          if (!pending) return new Response(JSON.stringify({ success: false, message: 'ไม่พบรายการผู้สมัคร' }), { status: 404 });

          await env.DB.prepare('DELETE FROM pending_users WHERE LOWER(username) = ?').bind(uTrim.toLowerCase()).run();
          await env.DB.prepare('INSERT OR REPLACE INTO users (username, password, rank, permit_do, em_name) VALUES (?, ?, "P1", 1, ?)').bind(pending.username, pending.password, pending.em_name).run();

          return new Response(JSON.stringify({ success: true, user: { Username: pending.username, EmName: pending.em_name } }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'PUT') {
          const body = await request.json();
          const targetUsername = String(body.username || '').trim();
          const newPermit = parseInt(body.permitDo, 10);
          const requestorPermit = parseInt(body.requestorPermitDo, 10);

          if (!targetUsername || isNaN(newPermit)) return new Response(JSON.stringify({ success: false, message: 'ข้อมูลไม่ครบถ้วน' }), { status: 400 });

          const targetUser = await env.DB.prepare('SELECT permit_do FROM users WHERE LOWER(username) = ?').bind(targetUsername.toLowerCase()).first();
          if (!targetUser) return new Response(JSON.stringify({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' }), { status: 404 });

          if (requestorPermit < 3 && targetUser.permit_do >= 3) {
            return new Response(JSON.stringify({ success: false, message: 'ไม่มีสิทธิ์ปรับระดับผู้ใช้ที่เป็น P3' }), { status: 403 });
          }

          const newRank = newPermit >= 3 ? 'P3' : newPermit >= 2 ? 'P2' : 'P1';
          await env.DB.prepare('UPDATE users SET permit_do = ?, rank = ? WHERE LOWER(username) = ?').bind(newPermit, newRank, targetUsername.toLowerCase()).run();

          return new Response(JSON.stringify({ success: true, newPermit, newRank }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (method === 'DELETE') {
          const targetUsername = url.searchParams.get('username');
          const type = url.searchParams.get('type') || 'pending';
          const requestorPermit = parseInt(url.searchParams.get('requestorPermit') || '0', 10);

          if (!targetUsername) return new Response(JSON.stringify({ success: false, message: 'กรุณาระบุชื่อผู้ใช้' }), { status: 400 });

          if (type === 'user') {
            const targetUser = await env.DB.prepare('SELECT permit_do FROM users WHERE LOWER(username) = ?').bind(targetUsername.trim().toLowerCase()).first();
            if (!targetUser) return new Response(JSON.stringify({ success: false, message: 'ไม่พบผู้ใช้' }), { status: 404 });
            if (requestorPermit < 3 && targetUser.permit_do >= 3) {
              return new Response(JSON.stringify({ success: false, message: 'ไม่มีสิทธิ์ลบผู้ใช้ที่เป็น P3' }), { status: 403 });
            }
            await env.DB.prepare('DELETE FROM users WHERE LOWER(username) = ?').bind(targetUsername.trim().toLowerCase()).run();
          } else {
            await env.DB.prepare('DELETE FROM pending_users WHERE LOWER(username) = ?').bind(targetUsername.trim().toLowerCase()).run();
          }

          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }
      }
    } catch (apiErr) {
      return new Response(JSON.stringify({ success: false, error: apiErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    // ─── Static Assets ───
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return await env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};