export type CycleRange = "Roadeo" | "Junior Roadsters" | "Senior Roadsters" | "Ninety One E-Bikes" | "Ninety One EV" | "Indian Bicycles" | "Indian E-Bikes" | "Other";
export type CycleMake = "Hercules" | "BSA / Hercules" | "Ninety One" | "Hero" | "Firefox" | "Montra" | "Tata Stryder" | "Cradiac" | "Leader" | "EMotorad" | "Other";

export interface CycleSeed {
  slug: string;
  model: string;
  make: CycleMake;
  range: CycleRange;
  wheelSize: string | null;
  detail: string | null;
  imageUrl: string | null;
  sourcePage: string | null;
  isFeatured: boolean;
}

export interface CycleRecord extends CycleSeed {
  id: number;
  ownerAdded: boolean;
}

export interface CreateCycleInput {
  model: string;
  make: CycleMake;
  range: CycleRange;
  wheelSize?: string;
  detail?: string;
  imageUrl?: string;
}
