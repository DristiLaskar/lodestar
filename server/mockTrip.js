// Canned itinerary used by AI_MOCK=true and by the failure lab. It exists so
// the UI can be developed and demoed without an API key, and so every kind of
// bad output can be reproduced on demand. Titles say "demo" on purpose.
const S = (day, title, kind, time, durationMin, area, description, tip, costEstimate, lat, lng) => ({
  type: 'stop', day, title, kind, time, durationMin, area, description, tip, costEstimate, lat, lng,
});

export const PLAN = [
  { type: 'trip', title: 'Kyoto, unhurried (demo data)', destination: 'Kyoto, Japan', summary: 'Three slow days of shrines, markets and tea. Early starts keep the crowds away; evenings stay loose.', currency: 'JPY', bestFor: ['slow travel', 'temples', 'food'], days: 3 },
  { type: 'day', day: 1, title: 'Eastern Kyoto' },
  S(1, 'Fushimi Inari Taisha', 'culture', '07:00', 120, 'Fushimi', 'Walk the torii tunnels before the tour buses arrive. The upper loop is quieter and shaded.', 'Turn back at Yotsutsuji for the best view.', 0, 34.9671, 135.7727),
  S(1, 'Nishiki Market', 'food', '11:30', 75, 'Downtown', 'A covered lane of pickles, tamagoyaki and skewers. Graze rather than sit down.', 'Most stalls ask you to finish eating before you walk on.', 1500, 35.005, 135.7649),
  S(1, 'Kiyomizu-dera', 'sight', '14:00', 90, 'Higashiyama', 'The wooden stage hangs over the hillside. Come down through Sannenzaka for the old shopfronts.', 'Entry is cheaper before the evening illumination.', 500, 34.9949, 135.785),
  S(1, 'Gion at dusk', 'nightlife', '18:00', 90, 'Gion', 'Wander Hanamikoji and the Shirakawa canal as lanterns come on. Dinner at a small izakaya.', 'Do not follow or photograph geiko in the lanes.', 4500, 35.0037, 135.7756),
  { type: 'day', day: 2, title: 'Arashiyama and the west' },
  S(2, 'Bamboo Grove', 'nature', '08:00', 45, 'Arashiyama', 'Go at opening time; by ten the path is a queue. Linger at the quiet side lane.', 'Take the early Sagano line from Kyoto Station.', 0, 35.017, 135.6713),
  S(2, 'Tenryu-ji garden', 'culture', '09:30', 75, 'Arashiyama', 'A UNESCO Zen garden with a pond that has not changed in 700 years. Sit on the veranda.', 'Exit through the north gate straight into the grove.', 800, 35.0158, 135.6742),
  S(2, 'Kinkaku-ji', 'sight', '13:30', 60, 'Kita', 'The gold pavilion mirrored in its pond. Short loop, so keep the afternoon light for photos.', 'Walk on to Ryoan-ji, ten minutes away, for the rock garden.', 500, 35.0394, 135.7292),
  S(2, 'Pontocho dinner', 'food', '18:30', 100, 'Pontocho', 'A narrow lane of kaiseki and yakitori counters above the Kamo river.', 'Reserve the riverside terrace on weekends.', 5000, 35.0057, 135.7708),
  { type: 'day', day: 3, title: 'Quiet philosophy' },
  S(3, "Philosopher's Path", 'nature', '09:00', 75, 'Sakyo', 'A canal-side stroll between two temples, best in morning light.', 'Begin at the Ginkaku-ji end to walk downhill.', 0, 35.027, 135.7948),
  S(3, 'Nanzen-ji', 'culture', '11:00', 75, 'Sakyo', 'A vast gate, a brick aqueduct and a sub-temple garden for the price of a coffee.', 'The Sanmon gate climb is worth the extra ticket.', 600, 35.0113, 135.7937),
  S(3, 'Ippodo Tea', 'food', '14:00', 60, 'Nakagyo', 'A tea house that has been selling leaf since 1717. Order the matcha with wagashi.', 'Buy a tin of gyokuro to take home.', 1400, 35.0128, 135.7595),
  S(3, 'Kamo river at sunset', 'nature', '17:30', 60, 'Kamogawa', 'Sit on the stone steps at Sanjo and watch the city slow down.', 'Pick up konbini snacks on the way.', 800, 35.0116, 135.7681),
  { type: 'budget', items: [{ label: 'Food', amount: 21000 }, { label: 'Sights', amount: 3900 }, { label: 'Transport', amount: 4800 }, { label: 'Stay', amount: 36000 }] },
  { type: 'checklist', title: 'Before you go', items: ['Load an IC card (ICOCA) on your phone', 'Carry cash for small shops and shrines', 'Comfortable shoes with easy laces', 'Download offline maps', 'Book Pontocho dinner ahead', 'Pack a light rain layer'] },
  { type: 'tip', title: 'Beat the crowds', text: 'Start at dawn at the big sights and save markets and museums for midday.' },
  { type: 'tip', title: 'Buses are slow', text: 'Trains and a bicycle beat the city bus between most of these stops.' },
  { type: 'done' },
];

// Assumes the ids the client assigns (s1…s12, in order).
export const REFINE = [
  { type: 'op', op: 'add_stop', day: 2, afterId: 's6', stop: { title: 'Okochi Sanso garden', kind: 'nature', time: '10:45', durationMin: 60, area: 'Arashiyama', description: 'A hillside villa garden with a matcha and sweets included in entry.', tip: 'Quiet even at midday.', costEstimate: 1000, lat: 35.0183, lng: 135.6773 } },
  { type: 'op', op: 'update_stop', id: 's8', changes: { time: '19:00', tip: 'Book a table; the 19:00 slot is calmer.' } },
  { type: 'op', op: 'remove_stop', id: 's12' },
  { type: 'note', text: 'Added a garden on day 2, pushed dinner later and cleared the last evening.' },
  { type: 'done' },
];

// A completely different JSON shape, to prove the client can recover.
export const ALT_SHAPE = {
  itinerary: [
    { day: 1, label: 'Old town', activities: [
      { name: 'Fushimi Inari', category: 'temple', start: '9:00 AM', coordinates: { latitude: 34.9671, longitude: 135.7727 }, notes: 'Go early.' },
      { name: 'Nishiki Market', category: 'market', start: '1:00 PM', coordinates: { latitude: 35.005, longitude: 135.7649 }, notes: 'Graze, do not sit.' },
    ] },
    { day: 2, label: 'West', activities: [
      { name: 'Bamboo Grove', category: 'park', start: '8:00 AM', coordinates: [35.017, 135.6713], notes: 'Arrive at opening.' },
    ] },
  ],
};
