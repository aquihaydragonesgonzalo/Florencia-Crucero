import React, { useState } from 'react';
import { 
    Sun, Cloud, CloudRain, CloudLightning, Wind, Activity as ActivityIcon, 
    Clock, Footprints, PhoneCall, Send, Thermometer, CalendarDays, Languages, Volume2, FileDown 
} from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Coords, WeatherData, ItineraryItem } from '../types';
import { PRONUNCIATIONS } from '../constants';

interface GuideProps {
    userLocation: Coords | null;
    itinerary: ItineraryItem[];
    weather: WeatherData | null;
}

const Guide: React.FC<GuideProps> = ({ userLocation, itinerary, weather }) => {
    const [playing, setPlaying] = useState<string | null>(null);

    const getWeatherIcon = (code: number, size = 20) => {
        if (code <= 1) return <Sun size={size} className="text-amber-500" />;
        if (code <= 3) return <Cloud size={size} className="text-slate-400" />;
        if (code <= 67) return <CloudRain size={size} className="text-blue-500" />;
        if (code <= 99) return <CloudLightning size={size} className="text-purple-500" />;
        return <Wind size={size} className="text-slate-400" />;
    };

    const playSimulatedAudio = (word: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'it-IT';
            utterance.rate = 0.85;
            setPlaying(word);
            utterance.onend = () => setPlaying(null);
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleSOS = () => {
        const message = userLocation ? `¡SOS! Necesito ayuda en Florencia. Mi ubicación actual es: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}` : `¡SOS! Necesito ayuda en Florencia. No puedo obtener mi ubicación GPS.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const totalBudget = itinerary.reduce((acc, item) => acc + item.priceEUR, 0);

        // --- HEADER BACKGROUND ---
        doc.setFillColor(30, 58, 138); // Blue 900
        doc.rect(0, 0, 210, 40, 'F');
        
        // --- HEADER TEXT ---
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.text("FLORENCIA 2026", 14, 18);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Guía de Escala & Itinerario Detallado", 14, 26);
        doc.text("Fecha: 15 Abril 2026", 14, 32);

        // --- SHIP INFO (Header Right) ---
        doc.setFontSize(10);
        doc.text("TODOS A BORDO: 19:30", 195, 18, { align: 'right' });
        doc.text("SALIDA: 20:00", 195, 24, { align: 'right' });
        doc.setFont("helvetica", "bold");
        doc.text("EMERGENCIA: +39 112", 195, 32, { align: 'right' });

        // --- SUMMARY SECTION ---
        let finalY = 50;
        
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(14);
        doc.text("Resumen de la Visita", 14, finalY);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(14, finalY + 2, 195, finalY + 2);

        finalY += 10;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        
        doc.text(`• Presupuesto Estimado: EUR ${totalBudget}`, 14, finalY);
        doc.text(`• Puntos de Interés: ${itinerary.filter(i => i.type === 'sightseeing').length}`, 80, finalY);
        doc.text(`• Distancia Aprox: ~5.5 km`, 140, finalY);
        
        finalY += 6;
        doc.setTextColor(180, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`• NOTA CRITICA: Tren de vuelta 15:26. Siguiente: 16:28 (Arriesgado).`, 14, finalY);

        // --- ITINERARY TABLE ---
        finalY += 12;

        const tableBody = itinerary.map(item => {
            // NOTE: Removed Emojis as standard jsPDF fonts do not support them and they cause text overlapping.
            const time = `${item.startTime}\n-\n${item.endTime}`;
            
            let activity = item.title.toUpperCase();
            if (item.type === 'sightseeing') activity = `(VISITA) ${activity}`;
            if (item.type === 'logistics') activity = `(!) ${activity}`;
            
            // Replaced emoji icons with text labels
            activity += `\nLugar: ${item.locationName}`;
            if (item.endLocationName) activity += `\n-> ${item.endLocationName}`;

            let details = item.description;
            if (item.keyDetails) details += `\nNota: ${item.keyDetails}`;
            if (item.contingencyNote) details += `\nALERTA: ${item.contingencyNote.toUpperCase()}`;
            
            let meta = item.type.toUpperCase();
            if (item.priceEUR > 0) meta += `\nEUR ${item.priceEUR}`;
            if (item.notes === 'CRITICAL') meta += `\nCRITICO`;

            return [time, activity, details, meta];
        });

        // Use 'any' cast to avoid TypeScript build errors with jspdf-autotable types
        (autoTable as any)(doc, {
            startY: finalY,
            head: [['Hora', 'Actividad & Ubicación', 'Detalles & Contingencias', 'Info']],
            body: tableBody,
            theme: 'grid',
            headStyles: { 
                fillColor: [30, 58, 138], 
                textColor: 255, 
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 4,
                valign: 'middle', 
                overflow: 'linebreak',
                lineColor: [230, 230, 230],
                lineWidth: 0.1,
                font: 'helvetica'
            },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [30, 58, 138] }, 
                1: { cellWidth: 60, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }, 
                3: { cellWidth: 25, halign: 'center', fontSize: 7 }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            didDrawPage: function (data: any) {
                // Footer
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150);
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.text(`Pagina ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`, data.settings.margin.left, pageHeight - 10);
                doc.text('Generado por Florencia 2026 App', pageSize.width - 15, pageHeight - 10, { align: 'right' });
            }
        });

        doc.save('Florencia_Itinerario_Completo.pdf');
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' }).format(date);
    };

    const visitSummary = {
        totalWindow: "12h 30min",
        sightseeingTime: "4h 10min",
        logisticsTime: "5h 20min",
        estimatedDistance: "5.5 km",
        stepsApprox: "~7.500",
        poiCount: 19,
        accessibility: "Transporte público + Caminata"
    };

    return (
        <div className="pb-32 px-4 pt-6 max-w-lg mx-auto h-full overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-blue-900 uppercase tracking-tight">Guía Florencia</h2>
                <button 
                    onClick={handleDownloadPDF}
                    className="bg-blue-100 text-blue-800 p-2 rounded-xl active:scale-95 transition-transform hover:bg-blue-200"
                    aria-label="Descargar Informe Detallado"
                >
                    <FileDown size={20} />
                </button>
            </div>

            <div className="mb-8 bg-white rounded-[2rem] border border-blue-50 shadow-md p-6 overflow-hidden relative">
                <div className="flex items-center gap-2 mb-4">
                    <ActivityIcon size={18} className="text-blue-700" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Resumen de la Visita</h3>
                </div>
                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Escala Total</span><div className="flex items-center gap-1.5"><Clock size={14} className="text-blue-600" /><span className="text-sm font-black text-blue-950">{visitSummary.totalWindow}</span></div></div>
                    <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Turismo Activo</span><div className="flex items-center gap-1.5"><Sun size={14} className="text-amber-500" /><span className="text-sm font-black text-blue-950">{visitSummary.sightseeingTime}</span></div></div>
                    <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Distancia a pie</span><div className="flex items-center gap-1.5"><ActivityIcon size={14} className="text-emerald-600" /><span className="text-sm font-black text-blue-950">{visitSummary.estimatedDistance}</span></div></div>
                    <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Pasos aprox.</span><div className="flex items-center gap-1.5"><Footprints size={14} className="text-slate-600" /><span className="text-sm font-black text-blue-950">{visitSummary.stepsApprox}</span></div></div>
                </div>
            </div>

            <div className="mb-8 bg-rose-700 rounded-[2rem] p-6 shadow-xl text-white relative overflow-hidden border-2 border-white/10">
                <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center mb-3"><PhoneCall size={24} className="text-white animate-pulse mr-3" /><h3 className="font-black text-lg uppercase tracking-widest">ASISTENCIA SOS</h3></div>
                    <p className="text-xs text-rose-50 mb-6 leading-relaxed font-medium">Si te desorientas en el centro, envía tu ubicación GPS exacta al contacto de emergencia por WhatsApp.</p>
                    <button onClick={handleSOS} className="w-full py-4 bg-white text-rose-800 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest text-sm active:scale-95 transition-transform"><Send size={18} /> Enviar Localización</button>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center uppercase tracking-widest px-1"><Thermometer size={18} className="mr-2 text-blue-900"/> Tiempo en Florencia</h3>
                {!weather ? (<div className="h-24 bg-white rounded-3xl animate-pulse border border-blue-50"></div>) : (
                    <>
                        <div className="bg-white p-2 pb-5 rounded-[2.5rem] border border-blue-50 shadow-xl overflow-hidden mb-4">
                            <h4 className="text-[10px] font-black text-blue-300 uppercase tracking-widest text-center mt-2 mb-2">Hoy</h4>
                            <div className="flex overflow-x-auto gap-3 px-6 py-2 no-scrollbar">
                                {weather.hourly.time.map((time, i) => {
                                    const hour = new Date(time).getHours();
                                    if (hour >= 8 && hour <= 20) return (
                                        <div key={time} className="flex flex-col items-center justify-between min-w-[70px] p-3 bg-blue-50/50 rounded-3xl border border-blue-100">
                                            <span className="text-[10px] font-black text-blue-400 mb-2">{hour}:00</span>
                                            <div className="p-2 bg-white rounded-2xl mb-2 shadow-sm">{getWeatherIcon(weather.hourly.code[i], 24)}</div>
                                            <span className="text-sm font-black text-blue-900">{Math.round(weather.hourly.temperature[i])}°</span>
                                        </div>
                                    );
                                    return null;
                                })}
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-blue-50 shadow-lg p-5">
                            <div className="flex items-center gap-2 mb-4 px-1"><CalendarDays size={16} className="text-blue-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Próximos 5 días</span></div>
                            <div className="space-y-1">
                                {weather.daily.time.slice(0, 5).map((day, i) => (
                                    <div key={day} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                                        <span className="w-16 text-xs font-bold text-slate-600 capitalize">{formatDate(day)}</span>
                                        <div className="flex items-center gap-3">{getWeatherIcon(weather.daily.weathercode[i], 18)}</div>
                                        <div className="flex items-center gap-3 w-20 justify-end"><span className="text-xs font-bold text-slate-800">{Math.round(weather.daily.temperature_2m_max[i])}°</span><span className="text-xs font-medium text-slate-400">{Math.round(weather.daily.temperature_2m_min[i])}°</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center uppercase tracking-widest px-1"><Languages size={18} className="mr-2 text-blue-900"/> Italiano Básico</h3>
            <div className="bg-white rounded-3xl shadow-md border border-blue-50 overflow-hidden mb-8">
                {PRONUNCIATIONS.map((item) => (
                    <div key={item.word} className="p-5 flex justify-between items-center border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors group">
                        <div><div className="flex items-center gap-3"><p className="font-black text-blue-950 text-lg">{item.word}</p><button onClick={() => playSimulatedAudio(item.word)} className={`p-2 rounded-full transition-all ${playing === item.word ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50'}`}><Volume2 size={16} /></button></div><p className="text-xs text-slate-500 italic">"{item.simplified}"</p></div>
                        <p className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter border border-blue-100">{item.meaning}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Guide;