import { Battery, Zap, Martini, Lasso, Lightbulb, User, Guitar, Shield, Rocket, Circle, Brain } from 'lucide-react';

export interface Level {
    minPoints: number;
    title: string;
    description: string;
    icon: any;
}

export const LEVELS: Level[] = [
    {
        minPoints: 0,
        title: "Leerlauf-Azubi",
        description: "Noch ist hier nicht viel Saft auf der Leitung. Ab an die Säule mit dir!",
        icon: Battery
    },
    {
        minPoints: 50,
        title: "Der Funke springt über",
        description: "Es knistert zwischen uns! Du hast die ersten 5 Dates mit der Ladesäule hinter dir.",
        icon: Zap
    },
    {
        minPoints: 100,
        title: "Stammgast im Saftladen",
        description: "Du weißt, wo der beste Strom fließt. Andere gehen in die Bar, du hängst am Kabel.",
        icon: Martini
    },
    {
        minPoints: 150,
        title: "Kabel-Jongleur",
        description: "Du wickelst das Ladekabel mittlerweile schneller auf als ein Cowboy sein Lasso.",
        icon: Lasso
    },
    {
        minPoints: 200,
        title: "Watt geht ab?!",
        description: "20 Mal geladen? Watt für eine Leistung! Du kennst dich mit Spannung aus.",
        icon: Lightbulb
    },
    {
        minPoints: 250,
        title: "Ohm my God!",
        description: "Der Widerstand ist zwecklos. Du bist jetzt offiziell süchtig nach Elektronen.",
        icon: User // Placeholder for Monk/Ohm
    },
    {
        minPoints: 300,
        title: "AC/DC Rocker",
        description: "Egal ob Wechsel- oder Gleichstrom, du rockst die Ladesäule.",
        icon: Guitar
    },
    {
        minPoints: 400,
        title: "Hüter der Wallbox",
        description: "Du hast mehr Zeit an Ladesäulen verbracht als manche Leute im Urlaub.",
        icon: Shield
    },
    {
        minPoints: 500,
        title: "Super-Charged Survivor",
        description: "Halbzeit zur Unsterblichkeit! Dein Auto ist voller als dein Terminkalender.",
        icon: Rocket
    },
    {
        minPoints: 750,
        title: "Lord of the Range",
        description: "Ein Ring sie zu knechten? Nein, ein Stecker sie zu laden!",
        icon: Circle
    },
    {
        minPoints: 1000,
        title: "Das wandelnde Kraftwerk",
        description: "UNFASSBAR! Wenn du den Raum betrittst, gehen die Lichter von alleine an.",
        icon: Brain // Zeus/Mind related
    }
];

export function calculateLevel(points: number): Level {
    // Iterate backwards to find the highest matching level
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (points >= LEVELS[i].minPoints) {
            return LEVELS[i];
        }
    }
    return LEVELS[0];
}

export function getNextLevel(currentLevel: Level): Level | null {
    const index = LEVELS.indexOf(currentLevel);
    if (index >= 0 && index < LEVELS.length - 1) {
        return LEVELS[index + 1];
    }
    return null;
}
