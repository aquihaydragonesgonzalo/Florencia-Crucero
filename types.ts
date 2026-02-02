export interface Coords {
    lat: number;
    lng: number;
}

export interface ItineraryItem {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    locationName: string;
    endLocationName?: string;
    coords: Coords;
    endCoords?: Coords;
    description: string;
    keyDetails: string;
    priceEUR: number;
    type: 'logistics' | 'transport' | 'sightseeing' | 'food';
    completed: boolean;
    notes?: string;
    contingencyNote?: string;
    audioGuideText?: string;
    imageUrl?: string;
    googleMapsUrl?: string;
    ticketUrl?: string;
}

export interface Waypoint {
    name: string;
    lat: number;
    lng: number;
}

export interface Pronunciation {
    word: string;
    phonetic: string;
    simplified: string;
    meaning: string;
}

export interface WeatherData {
    hourly: {
        time: string[];
        temperature: number[];
        code: number[];
    };
    daily: {
        time: string[];
        weathercode: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
    };
}