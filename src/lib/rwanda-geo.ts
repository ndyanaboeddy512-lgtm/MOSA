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

// 7-Tier Geographic Hierarchy: Country -> 5 Provinces -> 30 Districts -> Sectors -> Cells -> Localities
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
            },
          },
          kimisagara: {
            name: "Kimisagara",
            nameRw: "Kimisagara",
            cells: {
              katabaro: {
                name: "Katabaro",
                nameRw: "Katabaro",
                communities: [
                  { name: "Katabaro Commercial Strip", nameRw: "Katabaro Hagati", code: "katabaro_strip", lat: -1.9675, lng: 30.0445 },
                ],
              },
            },
          },
          nyarugenge: {
            name: "Nyarugenge",
            nameRw: "Nyarugenge",
            cells: {
              kiyovu: {
                name: "Kiyovu",
                nameRw: "Kiyovu",
                communities: [
                  { name: "Downtown Commercial Center", nameRw: "Hagati mu Mujyi", code: "kigali_downtown", lat: -1.9520, lng: 30.0620 },
                ],
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
                  { name: "MINAGRI Area (KG 569 St)", nameRw: "Ahegereye MINAGRI (KG 569 St)", code: "kacyiru_minagri", lat: -1.9365, lng: 30.0868 },
                  { name: "Kamutwa Center", nameRw: "Kamutwa Rwagakoco", code: "kamutwa_center", lat: -1.9450, lng: 30.0850 },
                  { name: "Boulevard de l'Umuganda Corridor", nameRw: "Boulevard de l'Umuganda", code: "umuganda_corridor", lat: -1.9335, lng: 30.0890 },
                ],
              },
              kibaza: {
                name: "Kibaza",
                nameRw: "Kibaza",
                communities: [
                  { name: "Kibaza Commercial Strip", nameRw: "Kibaza Hagati", code: "kibaza_strip", lat: -1.9342, lng: 30.0915 },
                ],
              },
              kamatamu: {
                name: "Kamatamu",
                nameRw: "Kamatamu",
                communities: [
                  { name: "Kamatamu Artisanal Alley", nameRw: "Ubukorikori bwa Kamatamu", code: "kamatamu_alley", lat: -1.9388, lng: 30.0835 },
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
                communities: [
                  { name: "Kimironko Grand Market", nameRw: "Isoko rya Kimironko", code: "kimironko_market", lat: -1.9525, lng: 30.1255 },
                ],
              },
            },
          },
          remera: {
            name: "Remera",
            nameRw: "Remera",
            cells: {
              nyabisindu: {
                name: "Nyabisindu",
                nameRw: "Nyabisindu",
                communities: [
                  { name: "Giporoso Commercial Strip", nameRw: "Kuri Giporoso", code: "remera_giporoso", lat: -1.9515, lng: 30.1065 },
                ],
              },
            },
          },
          gisozi: {
            name: "Gisozi",
            nameRw: "Gisozi",
            cells: {
              musezero: {
                name: "Musezero",
                nameRw: "Musezero",
                communities: [
                  { name: "Gisozi Timber Hub", nameRw: "Ahabajirwa imbaho i Gisozi", code: "gisozi_timber", lat: -1.9195, lng: 30.0615 },
                ],
              },
            },
          },
        },
      },
      kicukiro: {
        name: "Kicukiro",
        nameRw: "Kicukiro",
        sectors: {
          niboye: {
            name: "Niboye",
            nameRw: "Niboye",
            cells: {
              niboye: {
                name: "Niboye",
                nameRw: "Niboye",
                communities: [
                  { name: "Niboye Center", nameRw: "Hagati muri Niboye", code: "niboye_center", lat: -1.9745, lng: 30.1075 },
                ],
              },
            },
          },
          gahanga: {
            name: "Gahanga",
            nameRw: "Gahanga",
            cells: {
              karembure: {
                name: "Karembure",
                nameRw: "Karembure",
                communities: [
                  { name: "Gahanga Industrial Strip", nameRw: "Inganda za Gahanga", code: "gahanga_industrial", lat: -2.0315, lng: 30.1078 },
                ],
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
                communities: [
                  { name: "Musanze Town Center & Market", nameRw: "Isoko rya Musanze", code: "musanze_market", lat: -1.4998, lng: 29.6345 },
                ],
              },
            },
          },
          kinigi: {
            name: "Kinigi",
            nameRw: "Kinigi",
            cells: {
              kampanga: {
                name: "Kampanga",
                nameRw: "Kampanga",
                communities: [
                  { name: "Volcano Ecotourism Gate", nameRw: "Ahegereye Ibirunga", code: "kinigi_volcano", lat: -1.4275, lng: 29.5915 },
                ],
              },
            },
          },
        },
      },
      burera: {
        name: "Burera",
        nameRw: "Burera",
        sectors: {
          cyanika: {
            name: "Cyanika",
            nameRw: "Cyanika",
            cells: {
              kabyiniro: {
                name: "Kabyiniro",
                nameRw: "Kabyiniro",
                communities: [
                  { name: "Cyanika Border Post", nameRw: "Umupaka wa Cyanika", code: "cyanika_border", lat: -1.3475, lng: 29.7415 },
                ],
              },
            },
          },
        },
      },
      gicumbi: {
        name: "Gicumbi",
        nameRw: "Gicumbi",
        sectors: {
          byumba: {
            name: "Byumba",
            nameRw: "Byumba",
            cells: {
              nyamabuye: {
                name: "Nyamabuye",
                nameRw: "Nyamabuye",
                communities: [
                  { name: "Byumba Commercial Market", nameRw: "Isoko rya Byumba", code: "byumba_market", lat: -1.5755, lng: 30.0675 },
                ],
              },
            },
          },
        },
      },
      rulindo: {
        name: "Rulindo",
        nameRw: "Rulindo",
        sectors: {
          tare: {
            name: "Tare",
            nameRw: "Tare",
            cells: {
              gasiza: {
                name: "Gasiza",
                nameRw: "Gasiza",
                communities: [
                  { name: "Tare Highway Agri-Market", nameRw: "Isoko rya Tare ku Muhanda", code: "tare_market", lat: -1.7325, lng: 29.9825 },
                ],
              },
            },
          },
        },
      },
      gakenke: {
        name: "Gakenke",
        nameRw: "Gakenke",
        sectors: {
          gakenke: {
            name: "Gakenke",
            nameRw: "Gakenke",
            cells: {
              rusagara: {
                name: "Rusagara",
                nameRw: "Rusagara",
                communities: [
                  { name: "Gakenke Coffee & Agro Center", nameRw: "Ikawa n'Ubuhinzi Gakenke", code: "gakenke_center", lat: -1.6955, lng: 29.7885 },
                ],
              },
            },
          },
        },
      },
    },
  },
  southern: {
    name: "Southern Province",
    nameRw: "Intara y'Amajyepfo",
    districts: {
      huye: {
        name: "Huye",
        nameRw: "Huye",
        sectors: {
          ngoma: {
            name: "Ngoma",
            nameRw: "Ngoma",
            cells: {
              matyazo: {
                name: "Matyazo",
                nameRw: "Matyazo",
                communities: [
                  { name: "Butare University Corridor", nameRw: "Ahegereye Kaminuza i Butare", code: "butare_university", lat: -2.5975, lng: 29.7395 },
                ],
              },
            },
          },
        },
      },
      nyanza: {
        name: "Nyanza",
        nameRw: "Nyanza",
        sectors: {
          busasamana: {
            name: "Busasamana",
            nameRw: "Busasamana",
            cells: {
              nyanza: {
                name: "Nyanza",
                nameRw: "Nyanza",
                communities: [
                  { name: "Nyanza Royal Heritage Center", nameRw: "Ingoma y'i Nyanza", code: "nyanza_royal", lat: -2.3515, lng: 29.7495 },
                ],
              },
            },
          },
        },
      },
      muhanga: {
        name: "Muhanga",
        nameRw: "Muhanga",
        sectors: {
          nyamabuye: {
            name: "Nyamabuye",
            nameRw: "Nyamabuye",
            cells: {
              gitarama: {
                name: "Gitarama",
                nameRw: "Gitarama",
                communities: [
                  { name: "Muhanga Commercial Crossroads", nameRw: "Hagati mu Mujyi wa Muhanga", code: "muhanga_crossroads", lat: -2.0788, lng: 29.7558 },
                ],
              },
            },
          },
        },
      },
      kamonyi: {
        name: "Kamonyi",
        nameRw: "Kamonyi",
        sectors: {
          runda: {
            name: "Runda",
            nameRw: "Runda",
            cells: {
              ruyenzi: {
                name: "Ruyenzi",
                nameRw: "Ruyenzi",
                communities: [
                  { name: "Ruyenzi Commercial Strip", nameRw: "Hagati i Ruyenzi", code: "ruyenzi_strip", lat: -1.9955, lng: 29.9315 },
                ],
              },
            },
          },
        },
      },
      ruhango: {
        name: "Ruhango",
        nameRw: "Ruhango",
        sectors: {
          ruhango: {
            name: "Ruhango",
            nameRw: "Ruhango",
            cells: {
              buhoro: {
                name: "Buhoro",
                nameRw: "Buhoro",
                communities: [
                  { name: "Ruhango Market Center", nameRw: "Isoko rya Ruhango", code: "ruhango_market", lat: -2.2225, lng: 29.7805 },
                ],
              },
            },
          },
        },
      },
      nyamagabe: {
        name: "Nyamagabe",
        nameRw: "Nyamagabe",
        sectors: {
          gasaka: {
            name: "Gasaka",
            nameRw: "Gasaka",
            cells: {
              nyamagabe: {
                name: "Nyamagabe",
                nameRw: "Nyamagabe",
                communities: [
                  { name: "Nyamagabe Kitabi Corridor", nameRw: "Umuhanda wa Kitabi", code: "nyamagabe_kitabi", lat: -2.4775, lng: 29.4785 },
                ],
              },
            },
          },
        },
      },
      nyaruguru: {
        name: "Nyaruguru",
        nameRw: "Nyaruguru",
        sectors: {
          kibeho: {
            name: "Kibeho",
            nameRw: "Kibeho",
            cells: {
              nyange: {
                name: "Nyange",
                nameRw: "Nyange",
                communities: [
                  { name: "Kibeho Pilgrimage Sanctuary", nameRw: "Ubutaka Butagatifu Kibeho", code: "kibeho_sanctuary", lat: -2.7155, lng: 29.5245 },
                ],
              },
            },
          },
        },
      },
      gisagara: {
        name: "Gisagara",
        nameRw: "Gisagara",
        sectors: {
          ndora: {
            name: "Ndora",
            nameRw: "Ndora",
            cells: {
              dahwe: {
                name: "Dahwe",
                nameRw: "Dahwe",
                communities: [
                  { name: "Ndora District Center", nameRw: "Hagati i Ndora", code: "ndora_center", lat: -2.6175, lng: 29.8425 },
                ],
              },
            },
          },
        },
      },
    },
  },
  eastern: {
    name: "Eastern Province",
    nameRw: "Intara y'Iburasirazuba",
    districts: {
      rwamagana: {
        name: "Rwamagana",
        nameRw: "Rwamagana",
        sectors: {
          kigabiro: {
            name: "Kigabiro",
            nameRw: "Kigabiro",
            cells: {
              sibagire: {
                name: "Sibagire",
                nameRw: "Sibagire",
                communities: [
                  { name: "Rwamagana Bus Park & Market", nameRw: "Gari ya Rwamagana n'Isoko", code: "rwamagana_park", lat: -1.9480, lng: 30.4340 },
                ],
              },
            },
          },
        },
      },
      kayonza: {
        name: "Kayonza",
        nameRw: "Kayonza",
        sectors: {
          mukarange: {
            name: "Mukarange",
            nameRw: "Mukarange",
            cells: {
              kayonza: {
                name: "Kayonza",
                nameRw: "Kayonza",
                communities: [
                  { name: "Kayonza Transport Crossroads", nameRw: "Ihuriro rya Kayonza", code: "kayonza_crossroads", lat: -1.8975, lng: 30.6545 },
                ],
              },
            },
          },
        },
      },
      gatsibo: {
        name: "Gatsibo",
        nameRw: "Gatsibo",
        sectors: {
          kabarore: {
            name: "Kabarore",
            nameRw: "Kabarore",
            cells: {
              kabarore: {
                name: "Kabarore",
                nameRw: "Kabarore",
                communities: [
                  { name: "Kabarore Cattle Market", nameRw: "Isoko ry'Inka Kabarore", code: "kabarore_cattle", lat: -1.5965, lng: 30.4565 },
                ],
              },
            },
          },
        },
      },
      nyagatare: {
        name: "Nyagatare",
        nameRw: "Nyagatare",
        sectors: {
          nyagatare: {
            name: "Nyagatare",
            nameRw: "Nyagatare",
            cells: {
              barija: {
                name: "Barija",
                nameRw: "Barija",
                communities: [
                  { name: "Nyagatare Dairy Hub", nameRw: "Amata n'Amatungo Nyagatare", code: "nyagatare_dairy", lat: -1.2965, lng: 30.3245 },
                ],
              },
            },
          },
        },
      },
      bugesera: {
        name: "Bugesera",
        nameRw: "Bugesera",
        sectors: {
          nyamata: {
            name: "Nyamata",
            nameRw: "Nyamata",
            cells: {
              nyamata_ville: {
                name: "Nyamata Ville",
                nameRw: "Nyamata Ville",
                communities: [
                  { name: "Nyamata Airport Boulevard", nameRw: "Umujyi wa Nyamata", code: "nyamata_boulevard", lat: -2.1595, lng: 30.0895 },
                ],
              },
            },
          },
        },
      },
      ngoma: {
        name: "Ngoma",
        nameRw: "Ngoma",
        sectors: {
          kibungo: {
            name: "Kibungo",
            nameRw: "Kibungo",
            cells: {
              kibungo: {
                name: "Kibungo",
                nameRw: "Kibungo",
                communities: [
                  { name: "Kibungo Town Market", nameRw: "Isoko rya Kibungo", code: "kibungo_market", lat: -2.1635, lng: 30.5355 },
                ],
              },
            },
          },
        },
      },
      kirehe: {
        name: "Kirehe",
        nameRw: "Kirehe",
        sectors: {
          gatore: {
            name: "Gatore",
            nameRw: "Gatore",
            cells: {
              curazo: {
                name: "Curazo",
                nameRw: "Curazo",
                communities: [
                  { name: "Gatore Rice & Grain Center", nameRw: "Umuceri n'Imyaka Gatore", code: "gatore_rice", lat: -2.2675, lng: 30.6505 },
                ],
              },
            },
          },
        },
      },
    },
  },
  western: {
    name: "Western Province",
    nameRw: "Intara y'Iburengerazuba",
    districts: {
      rubavu: {
        name: "Rubavu",
        nameRw: "Rubavu",
        sectors: {
          gisenyi: {
            name: "Gisenyi",
            nameRw: "Gisenyi",
            cells: {
              kivumu: {
                name: "Kivumu",
                nameRw: "Kivumu",
                communities: [
                  { name: "Petite Barrière Cross-Border Market", nameRw: "Isoko ryo ku Mupaka Petite Barrière", code: "gisenyi_border", lat: -1.6775, lng: 29.2608 },
                ],
              },
            },
          },
        },
      },
      rusizi: {
        name: "Rusizi",
        nameRw: "Rusizi",
        sectors: {
          kamembe: {
            name: "Kamembe",
            nameRw: "Kamembe",
            cells: {
              kamembe: {
                name: "Kamembe",
                nameRw: "Kamembe",
                communities: [
                  { name: "Kamembe Port & Market", nameRw: "Icyambu n'Isoko rya Kamembe", code: "kamembe_port", lat: -2.4825, lng: 28.8975 },
                ],
              },
            },
          },
        },
      },
      karongi: {
        name: "Karongi",
        nameRw: "Karongi",
        sectors: {
          bwishyura: {
            name: "Bwishyura",
            nameRw: "Bwishyura",
            cells: {
              kibuye: {
                name: "Kibuye",
                nameRw: "Kibuye",
                communities: [
                  { name: "Kibuye Lakeside Promenade", nameRw: "Icyambu cy'Ikiyaga i Kibuye", code: "kibuye_lakeside", lat: -2.0615, lng: 29.3505 },
                ],
              },
            },
          },
        },
      },
      rutsiro: {
        name: "Rutsiro",
        nameRw: "Rutsiro",
        sectors: {
          gihango: {
            name: "Gihango",
            nameRw: "Gihango",
            cells: {
              gihango: {
                name: "Gihango",
                nameRw: "Gihango",
                communities: [
                  { name: "Gihango Commercial Center", nameRw: "Hagati i Gihango", code: "gihango_center", lat: -1.9355, lng: 29.3235 },
                ],
              },
            },
          },
        },
      },
      nyamasheke: {
        name: "Nyamasheke",
        nameRw: "Nyamasheke",
        sectors: {
          kagano: {
            name: "Kagano",
            nameRw: "Kagano",
            cells: {
              kagano: {
                name: "Kagano",
                nameRw: "Kagano",
                communities: [
                  { name: "Kagano Tea & Lakeside Strip", nameRw: "Icyayi n'Ikiyaga Kagano", code: "kagano_tea", lat: -2.3585, lng: 29.1455 },
                ],
              },
            },
          },
        },
      },
      ngororero: {
        name: "Ngororero",
        nameRw: "Ngororero",
        sectors: {
          ngororero: {
            name: "Ngororero",
            nameRw: "Ngororero",
            cells: {
              ngororero: {
                name: "Ngororero",
                nameRw: "Ngororero",
                communities: [
                  { name: "Ngororero Valley Market", nameRw: "Isoko rya Ngororero", code: "ngororero_market", lat: -1.8645, lng: 29.6245 },
                ],
              },
            },
          },
        },
      },
      nyabihu: {
        name: "Nyabihu",
        nameRw: "Nyabihu",
        sectors: {
          mukamira: {
            name: "Mukamira",
            nameRw: "Mukamira",
            cells: {
              jenda: {
                name: "Jenda",
                nameRw: "Jenda",
                communities: [
                  { name: "Mukamira Potato Hub", nameRw: "Ibirayi bya Mukamira", code: "mukamira_potato", lat: -1.6535, lng: 29.5095 },
                ],
              },
            },
          },
        },
      },
    },
  },
};

export const POPULAR_COMMUNITIES = [
  // Kigali
  { id: "kacyiru_minagri", name: "MINAGRI Area (KG 569 St), Kacyiru", sector: "Kacyiru", cell: "Kamutwa", count: 8 },
  { id: "kamutwa_center", name: "Kamutwa, Kacyiru", sector: "Kacyiru", cell: "Kamutwa", count: 6 },
  { id: "kibaza_strip", name: "Kibaza Commercial Strip, Kacyiru", sector: "Kacyiru", cell: "Kibaza", count: 5 },
  { id: "cosmos", name: "Cosmos & Commercial Center, Nyamirambo", sector: "Nyamirambo", cell: "Biryogo", count: 18 },
  { id: "biryogo_car_free", name: "Biryogo Car-Free Zone, Nyamirambo", sector: "Nyamirambo", cell: "Biryogo", count: 24 },
  { id: "tapi_rouge", name: "Tapi Rouge & Maison des Jeunes, Nyamirambo", sector: "Nyamirambo", cell: "Rwezamenyo", count: 14 },
  { id: "kimironko_market", name: "Kimironko Grand Market", sector: "Kimironko", cell: "Bibare", count: 32 },
  { id: "gisozi_timber", name: "Gisozi Carpentry & Timber Hub", sector: "Gisozi", cell: "Musezero", count: 22 },

  // Northern
  { id: "musanze_market", name: "Musanze Modern Market", sector: "Muhoza", cell: "Ruhengeri", count: 19 },
  { id: "kinigi_volcano", name: "Kinigi Volcano Ecotourism Gate", sector: "Kinigi", cell: "Kampanga", count: 11 },
  { id: "byumba_market", name: "Byumba Commercial Market, Gicumbi", sector: "Byumba", cell: "Nyamabuye", count: 15 },

  // Southern
  { id: "butare_university", name: "Butare University Corridor, Huye", sector: "Ngoma", cell: "Matyazo", count: 16 },
  { id: "nyanza_royal", name: "Nyanza Royal Heritage Milk Center", sector: "Busasamana", cell: "Nyanza", count: 12 },
  { id: "muhanga_crossroads", name: "Muhanga Commercial Crossroads", sector: "Nyamabuye", cell: "Gitarama", count: 20 },

  // Eastern
  { id: "rwamagana_park", name: "Rwamagana Bus Park & Market", sector: "Kigabiro", cell: "Sibagire", count: 14 },
  { id: "nyamata_boulevard", name: "Nyamata Town Center, Bugesera", sector: "Nyamata", cell: "Nyamata Ville", count: 17 },
  { id: "nyagatare_dairy", name: "Nyagatare Dairy Cattle Hub", sector: "Nyagatare", cell: "Barija", count: 13 },

  // Western
  { id: "gisenyi_border", name: "Petite Barrière Cross-Border Market, Rubavu", sector: "Gisenyi", cell: "Kivumu", count: 27 },
  { id: "kamembe_port", name: "Kamembe Port & Market, Rusizi", sector: "Kamembe", cell: "Kamembe", count: 21 },
  { id: "kibuye_lakeside", name: "Kibuye Lakeside Promenade, Karongi", sector: "Bwishyura", cell: "Kibuye", count: 10 },
];
