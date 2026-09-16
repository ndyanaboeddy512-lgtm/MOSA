export interface CommunityLocationNode {
  name: string;
  nameRw: string;
  code: string;
  lat: number;
  lng: number;
}

export interface CellNode {
  name: string;
  nameRw: string;
  communities: CommunityLocationNode[];
}

export interface SectorNode {
  name: string;
  nameRw: string;
  cells: Record<string, CellNode>;
}

export interface DistrictNode {
  name: string;
  nameRw: string;
  sectors: Record<string, SectorNode>;
}

export interface ProvinceNode {
  name: string;
  nameRw: string;
  districts: Record<string, DistrictNode>;
}

export const RWANDA_HIERARCHY: Record<string, ProvinceNode> = {
  kigali: {
    name: "Kigali City",
    nameRw: "Umujyi wa Kigali",
    districts: {
      nyarugenge: {
        name: "Nyarugenge",
        nameRw: "Nyarugenge",
        sectors: {
          nyamirambo: {
            name: "Nyamirambo",
            nameRw: "Nyamirambo",
            cells: {
              biryogo: {
                name: "Biryogo",
                nameRw: "Biryogo",
                communities: [
                  { name: "Car-Free Zone", nameRw: "Ahafatirwa Icyayi (Car-Free Zone)", code: "biryogo_car_free", lat: -1.9774, lng: 30.0482 },
                  { name: "Biryogo Market", nameRw: "Isoko rya Biryogo", code: "biryogo_market", lat: -1.9790, lng: 30.0475 },
                  { name: "Cosmos", nameRw: "Cosmos", code: "cosmos", lat: -1.9810, lng: 30.0460 },
                  { name: "Kiyovu cy'Abakene", nameRw: "Kiyovu cy'Abakene", code: "kiyovu_abakene", lat: -1.9750, lng: 30.0510 },
                ],
              },
              rwezamenyo: {
                name: "Rwezamenyo",
                nameRw: "Rwezamenyo",
                communities: [
                  { name: "Tapi Rouge", nameRw: "Tapi Rouge", code: "tapi_rouge", lat: -1.9840, lng: 30.0450 },
                  { name: "Maison des Jeunes", nameRw: "Maison des Jeunes Nyamirambo", code: "maison_jeunes", lat: -1.9825, lng: 30.0440 },
                  { name: "Mirongo Ine", nameRw: "Kuri 40", code: "kuri_40", lat: -1.9870, lng: 30.0425 },
                ],
              },
              mumena: {
                name: "Mumena",
                nameRw: "Mumena",
                communities: [
                  { name: "Mumena Stadium Area", nameRw: "Sitade ya Mumena", code: "mumena_stadium", lat: -1.9885, lng: 30.0490 },
                  { name: "Kivugiza Junction", nameRw: "Kivugiza", code: "kivugiza", lat: -1.9920, lng: 30.0480 },
                ],
              },
              cyivugiza: {
                name: "Cyivugiza",
                nameRw: "Cyivugiza",
                communities: [
                  { name: "Giti cy'Inyoni Area", nameRw: "Giti cy'Inyoni", code: "giti_inyoni", lat: -1.9950, lng: 30.0410 },
                  { name: "Mont Kigali Foot", nameRw: "Munsi ya Mont Kigali", code: "mont_kigali_foot", lat: -1.9980, lng: 30.0380 },
                ],
              },
            },
          },
          kimisagara: {
            name: "Kimisagara",
            nameRw: "Kimisagara",
            cells: {
              katabaro: {
                name: "Katabaro",
                nameRw: "Katabaro",
                communities: [{ name: "Katabaro Valley", nameRw: "Mu Gikombe cya Katabaro", code: "katabaro_val", lat: -1.968, lng: 30.045 }],
              },
            },
          },
        },
      },
      gasabo: {
        name: "Gasabo",
        nameRw: "Gasabo",
        sectors: {
          kacyiru: {
            name: "Kacyiru",
            nameRw: "Kacyiru",
            cells: {
              kamutwa: {
                name: "Kamutwa",
                nameRw: "Kamutwa",
                communities: [
                  { name: "MINAGRI Area (KG 569 St)", nameRw: "Ahegereye MINAGRI (KG 569 St)", code: "kacyiru_minagri", lat: -1.942, lng: 30.088 },
                  { name: "Kamutwa Center", nameRw: "Kamutwa Rwagakoco", code: "kamutwa_center", lat: -1.945, lng: 30.085 },
                ],
              },
              kibaza: {
                name: "Kibaza",
                nameRw: "Kibaza",
                communities: [
                  { name: "Kibaza Hill", nameRw: "Kibaza", code: "kibaza_hill", lat: -1.948, lng: 30.092 },
                ],
              },
              kamatamu: {
                name: "Kamatamu",
                nameRw: "Kamatamu",
                communities: [
                  { name: "Kamatamu Valley", nameRw: "Kamatamu", code: "kamatamu_valley", lat: -1.941, lng: 30.095 },
                ],
              },
            },
          },
          kimironko: {
            name: "Kimironko",
            nameRw: "Kimironko",
            cells: {
              bibare: {
                name: "Bibare",
                nameRw: "Bibare",
                communities: [{ name: "Kimironko Market", nameRw: "Isoko rya Kimironko", code: "kimironko_market", lat: -1.953, lng: 30.126 }],
              },
            },
          },
        },
      },
    },
  },
  northern: {
    name: "Northern Province",
    nameRw: "Intara y'Amajyaruguru",
    districts: {
      musanze: {
        name: "Musanze",
        nameRw: "Musanze",
        sectors: {
          muhoza: {
            name: "Muhoza",
            nameRw: "Muhoza",
            cells: {
              ruhengeri: {
                name: "Ruhengeri",
                nameRw: "Ruhengeri",
                communities: [{ name: "Musanze Town Center", nameRw: "Umujyi wa Musanze", code: "musanze_center", lat: -1.498, lng: 29.634 }],
              },
            },
          },
        },
      },
    },
  },
};

export const POPULAR_COMMUNITIES = [
  { id: "cosmos", name: "Cosmos, Nyamirambo", sector: "Nyamirambo", cell: "Biryogo", count: 18 },
  { id: "biryogo_car_free", name: "Biryogo Car-Free Zone", sector: "Nyamirambo", cell: "Biryogo", count: 24 },
  { id: "kacyiru_minagri", name: "MINAGRI Area (KG 569 St), Kacyiru", sector: "Kacyiru", cell: "Kamutwa", count: 8 },
  { id: "tapi_rouge", name: "Tapi Rouge", sector: "Nyamirambo", cell: "Rwezamenyo", count: 12 },
  { id: "kamutwa_center", name: "Kamutwa, Kacyiru", sector: "Kacyiru", cell: "Kamutwa", count: 6 },
  { id: "mumena_stadium", name: "Mumena Stadium Area", sector: "Nyamirambo", cell: "Mumena", count: 9 },
  { id: "kibaza_hill", name: "Kibaza, Kacyiru", sector: "Kacyiru", cell: "Kibaza", count: 5 },
  { id: "kivugiza", name: "Kivugiza", sector: "Nyamirambo", cell: "Mumena", count: 7 },
  { id: "kuri_40", name: "Kuri 40 (Mirongo Ine)", sector: "Nyamirambo", cell: "Rwezamenyo", count: 14 },
];
