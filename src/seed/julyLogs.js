// July 2026 training logs, transcribed from the original notes.
// Cleanups applied:
//  - "Set" in the notes = exercise, "Rep" = set  -> normalized to exercise -> sets
//  - Dates trusted over weekday labels (several days were all labelled "Monday")
//  - 15 July appeared twice -> merged into one session (weighted dragon fly kept)
//  - Standing calf "1120lbs" -> 120lbs (typo), "15kh" -> 15kg
//  - Leg press + single-arm cable work stored per side (perSide: true)
//  - Cardio moved into session notes

const s = (weight, unit, reps, feel = null, perSide = false) => ({ weight, unit, reps, feel, perSide })

export const JULY_2026 = [
  {
    date: '2026-07-01',
    split: 'Shoulder + Legs',
    notes: null,
    exercises: [
      { name: 'Overhead Dumbbell Press', sets: [s(15, 'kg', 15, 'easy'), s(17.5, 'kg', 15, 'easy to heavy at end'), s(20, 'kg', 10, 'heavy to heavier at the end')] },
      { name: 'Front Raise (Dumbbell)', sets: [s(5, 'kg', 15, 'easy'), s(7.5, 'kg', 15, 'easy to heavy'), s(10, 'kg', 12, 'heavy to heavier')] },
      { name: 'Lateral Raise (Dumbbell)', sets: [s(5, 'kg', 12, 'easy to heavy'), s(7.5, 'kg', 10, 'heavy to little heavier'), s(10, 'kg', 10, 'very heavy to heavier')] },
      { name: 'Face Pull (Cable)', sets: [s(12.5, 'kg', 15, 'easy'), s(14.75, 'kg', 15, 'easy to heavy at the end')] },
      { name: 'Single-Arm Cable Lateral Raise', sets: [s(16, 'kg', 15, 'easy', true), s(23, 'kg', 15, 'heavy', true), s(30, 'kg', 9, 'very heavy', true)] },
      { name: 'Barbell Squat', sets: [s(10, 'kg', 15, 'easy'), s(15, 'kg', 10, 'easy to heavy'), s(15, 'kg', 8, 'heavy to heavier')] },
      { name: 'Leg Press', sets: [s(40, 'kg', 15, 'easy', true), s(60, 'kg', 10, 'heavy', true), s(70, 'kg', 10, 'heavier', true)] },
      { name: 'Leg Extension', sets: [s(35, 'lbs', 12, 'easy to heavy'), s(30, 'lbs', 13, 'heavy'), s(30, 'kg', 15)] },
      { name: 'Leg Curl', sets: [s(23, 'kg', 15), s(30, 'kg', 9), s(30, 'kg', 10, 'little pressure on lower back')] },
      { name: 'Hip Abductor (Outer)', sets: [s(25, 'lbs', 15, 'very easy'), s(30, 'lbs', 20), s(35, 'lbs', 20)] },
      { name: 'Hip Adductor (Inner)', sets: [s(25, 'lbs', 8), s(20, 'lbs', 15), s(25, 'lbs', 15)] },
    ],
  },
  {
    date: '2026-07-02',
    split: 'Chest + Biceps',
    notes: null,
    exercises: [
      { name: 'Flat Dumbbell Bench Press', sets: [s(15, 'kg', 15, 'easy'), s(17.5, 'kg', 15, 'easy'), s(20, 'kg', 10, 'last rep little hand shaking')] },
      { name: 'Incline Dumbbell Bench Press', sets: [s(12.5, 'kg', 15, 'easy, last 3 little heavy'), s(15, 'kg', 12, 'last 2 little heavy'), s(17.5, 'kg', 12, 'last 4 took slight support')] },
      { name: 'Pec Deck', sets: [s(60, 'lbs', 20, 'ultra easy'), s(80, 'lbs', 20, 'very easy'), s(100, 'lbs', 11, 'easy, last 4 heavy')] },
      { name: 'Low Cable Chest Fly', sets: [s(16, 'kg', 15, 'easy'), s(23, 'kg', 15, 'little heavy last 3'), s(30, 'kg', 10, 'little heavy at end')] },
      { name: 'Cable Bicep Curl', sets: [s(7.9, 'kg', 20, 'ultra easy'), s(10.2, 'kg', 20, 'very easy'), s(12.5, 'kg', 15, 'easy')] },
      { name: 'Dumbbell Bicep Curl', sets: [s(5, 'kg', 15, 'ultra easy'), s(7.5, 'kg', 15, 'very easy'), s(10, 'kg', 15, 'easy')] },
      { name: 'Hammer Curl', sets: [s(5, 'kg', 15, 'ultra easy'), s(7.5, 'kg', 15, 'very easy'), s(10, 'kg', 15, 'easy, last 4 little heavy')] },
    ],
  },
  {
    date: '2026-07-06',
    split: 'Chest + Biceps',
    notes: null,
    exercises: [
      { name: 'Flat Dumbbell Bench Press', sets: [s(15, 'kg', 15, 'easy'), s(17.5, 'kg', 12, 'hands shaking last 2'), s(20, 'kg', 15, 'easy at start, last 4 heavy + shaking')] },
      { name: 'Incline Dumbbell Bench Press', sets: [s(12.5, 'kg', 12, 'easy, last 2 little heavy'), s(15, 'kg', 10, 'shaking a little after 6'), s(17.5, 'kg', 10, 'last 4 took slight support')] },
      { name: 'Pec Deck', sets: [s(90, 'lbs', 20, 'ultra easy'), s(100, 'lbs', 15, 'easy'), s(110, 'lbs', 10, 'easy, last 4 heavy')] },
      { name: 'Low Cable Chest Fly', sets: [s(40.82, 'kg', 15, 'easy'), s(36, 'kg', 20, 'easy'), s(43, 'kg', 15, 'easy, no heavy feel at end')] },
      { name: 'EZ Bar Curl', sets: [s(0, 'kg', 20, 'bar only'), s(0, 'kg', 15, 'bar only'), s(2.5, 'kg', 15, 'easy')] },
      { name: 'Dumbbell Bicep Curl', sets: [s(7.5, 'kg', 20, 'easy'), s(10, 'kg', 15, 'easy'), s(12.5, 'kg', 12, 'easy to heavy, last 4')] },
      { name: 'Hammer Curl', sets: [s(7.5, 'kg', 15, 'easy'), s(10, 'kg', 15, 'little easy'), s(12.5, 'kg', 12, 'easy, last 4 little heavy')] },
    ],
  },
  {
    date: '2026-07-07',
    split: 'Back + Triceps',
    notes: null,
    exercises: [
      { name: 'Upper Back Machine Row', sets: [s(25, 'lbs', 15, 'easy'), s(30, 'lbs', 15, 'easy, last 4 little heavy'), s(35, 'lbs', 10, 'little heavy')] },
      { name: 'Wide-Grip Lat Pulldown', sets: [s(40, 'lbs', 12, 'little heavy, last 2-3 a lot'), s(45, 'lbs', 8, 'heavy'), s(50, 'lbs', 6, 'heavy, support for last 2')] },
      { name: 'Seated Cable Row', sets: [s(23.8, 'kg', 15, 'easy'), s(26.1, 'kg', 15, 'easy'), s(30.6, 'kg', 15, 'easy')] },
      { name: 'Single-Arm Lat Pulldown', sets: [s(10.2, 'kg', 15, 'easy'), s(12.5, 'kg', 15, 'left hand heavy after 11'), s(14.2, 'kg', 10, 'heavy')] },
      { name: 'Overhead Dumbbell Tricep Extension', sets: [s(15, 'kg', 25, 'very easy'), s(17.5, 'kg', 20, 'easy'), s(20, 'kg', 12, 'little heavy')] },
      { name: 'EZ Bar Skull Crusher', sets: [s(5, 'kg', 20, 'easy'), s(7.5, 'kg', 15, 'heavy last 3'), s(10, 'kg', 10, 'heavy, last 3 too much')] },
      { name: 'Tricep Cable Pushdown', sets: [s(14.7, 'kg', 15, 'easy'), s(17, 'kg', 15, 'easy'), s(19.3, 'kg', 15, 'easy to little heavy')] },
      { name: 'Overhead Cable Tricep Extension', sets: [s(17, 'kg', 15, 'easy'), s(19.3, 'kg', 15, 'easy')] },
    ],
  },
  {
    date: '2026-07-08',
    split: 'Shoulder + Legs',
    notes: null,
    exercises: [
      { name: 'Dragon Fly', sets: [s(0, 'kg', 15, 'bodyweight'), s(0, 'kg', 15, 'bodyweight'), s(0, 'kg', 15, 'bodyweight')] },
      { name: 'Barbell Squat', sets: [s(10, 'kg', 12, 'easy at start, last 3 heavy'), s(15, 'kg', 7, 'easy at start, last 3 heavy'), s(17.5, 'kg', 8, 'easy to heavier at end')] },
      { name: 'Leg Press', sets: [s(40.36, 'kg', 15, 'easy to heavy', true), s(60.78, 'kg', 12, 'heavy to heavier', true), s(60.78, 'kg', 15, 'heavier', true)] },
      { name: 'Leg Extension', sets: [s(35, 'lbs', 15, 'easy'), s(40, 'lbs', 15, 'easy to heavy at end'), s(45, 'lbs', 13, 'heavy to heavier, last 3')] },
      { name: 'Hip Abductor (Outer)', sets: [s(25, 'lbs', 20, 'very easy'), s(35, 'lbs', 16, 'easy'), s(45, 'lbs', 15, 'little heavy')] },
      { name: 'Standing Calf Raise', sets: [s(110, 'lbs', 15, 'very easy'), s(120, 'lbs', 15, 'very easy'), s(130, 'lbs', 15, 'easy')] },
      { name: 'Overhead Dumbbell Press', sets: [s(15, 'kg', 15, 'easy to heavy last 2'), s(17.5, 'kg', 13, 'heavy to heavier at end'), s(20, 'kg', 8)] },
      { name: 'Lateral Raise (Dumbbell)', sets: [s(7.5, 'kg', 15, 'easy to heavy at end'), s(10, 'kg', 7, 'heavy'), s(10, 'kg', 10, 'heavy, seated')] },
      { name: 'Face Pull (Cable)', sets: [s(12.5, 'kg', 15, 'easy'), s(14.7, 'kg', 15, 'easy'), s(17, 'kg', 10, 'easy to heavy at end')] },
      { name: 'Single-Arm Cable Lateral Raise', sets: [s(1.1, 'kg', 15, 'ultra easy', true), s(3.4, 'kg', 15, 'easy', true), s(16, 'kg', 15, null, true)] },
    ],
  },
  {
    date: '2026-07-09',
    split: 'Chest + Biceps',
    notes: 'Treadmill: 4.7 min @ 8 mph',
    exercises: [
      { name: 'Flat Dumbbell Bench Press', sets: [s(17.5, 'kg', 15, 'easy'), s(20, 'kg', 15, 'easy at start, last 4 heavy'), s(22.5, 'kg', 12, 'little heavy, last 4 needed support')] },
      { name: 'Incline Dumbbell Bench Press', sets: [s(12.5, 'kg', 15, 'easy, last 2 little heavy'), s(17.5, 'kg', 15, 'shaking a little after 4'), s(20, 'kg', 10, 'little heavy to heavier at end')] },
      { name: 'Pec Deck', sets: [s(90, 'lbs', 15, 'easy to heavy at end'), s(100, 'lbs', 11, 'heavy'), s(100, 'lbs', 12, 'heavy to heavier')] },
      { name: 'High Cable Chest Fly', sets: [s(43, 'kg', 20, 'easy'), s(50, 'kg', 11, 'easy at start, then heavy'), s(50, 'kg', 10, 'heavy')] },
      { name: 'Dumbbell Bicep Curl', sets: [s(7.5, 'kg', 15, 'ultra easy'), s(10, 'kg', 15, 'easy to heavy at end'), s(12.5, 'kg', 12, 'easy to heavy, last 4')] },
      { name: 'Hammer Curl', sets: [s(7.5, 'kg', 15, 'easy'), s(10, 'kg', 15, 'little easy'), s(12.5, 'kg', 12, 'easy, last 4 little heavy')] },
      { name: 'Preacher Curl', sets: [s(7.9, 'kg', 10, 'easy'), s(10.2, 'kg', 12, 'easy to heavy'), s(10.2, 'kg', 12, 'easy to heavy')] },
      { name: 'Wrist Curl', sets: [s(30, 'lbs', 15, 'easy'), s(40, 'lbs', 12, 'easy to heavy'), s(40, 'lbs', 12, 'easy to heavy')] },
    ],
  },
  {
    date: '2026-07-13',
    split: 'Chest + Biceps',
    notes: 'Treadmill: 4.7 min @ 8 mph',
    exercises: [
      { name: 'Flat Dumbbell Bench Press', sets: [s(17.5, 'kg', 15, 'easy'), s(20, 'kg', 15, 'easy at start, last 2 heavy'), s(22.5, 'kg', 12, 'little heavy, last 2 needed support')] },
      { name: 'Incline Dumbbell Bench Press', sets: [s(12.5, 'kg', 15, 'easy, last 1 little heavy'), s(17.5, 'kg', 12, 'easy to heavy'), s(20, 'kg', 10, 'little heavy to heavier at end')] },
      { name: 'Decline Dumbbell Bench Press', sets: [s(15, 'kg', 15, 'easy'), s(17.5, 'kg', 15, 'easy to little heavy'), s(20, 'kg', 14, 'easy to heavy')] },
      { name: 'Pec Deck', sets: [s(80, 'lbs', 15, 'very easy'), s(90, 'lbs', 15, 'easy'), s(100, 'lbs', 12, 'heavy to heavier')] },
      { name: 'High Cable Chest Fly', sets: [s(36, 'kg', 15, 'very easy'), s(43, 'kg', 15, 'easy'), s(50, 'kg', 15, 'little heavy')] },
      { name: 'Dumbbell Bicep Curl', sets: [s(7.5, 'kg', 15, 'ultra easy'), s(10, 'kg', 15, 'easy'), s(12.5, 'kg', 15, 'easy to little heavy')] },
      { name: 'Hammer Curl', sets: [s(7.5, 'kg', 15, 'very easy'), s(10, 'kg', 15, 'little easy'), s(12.5, 'kg', 15, 'easy to little heavy')] },
      { name: 'Wrist Curl', sets: [s(30, 'lbs', 15, 'easy'), s(40, 'lbs', 12, 'easy to heavy'), s(40, 'lbs', 12, 'easy to heavy')] },
    ],
  },
  {
    date: '2026-07-14',
    split: 'Back + Triceps',
    notes: null,
    exercises: [
      { name: 'Upper Back Machine Row', sets: [s(25, 'lbs', 15, 'easy'), s(30, 'lbs', 15, 'easy, last 4 little heavy'), s(35, 'lbs', 10, 'little heavy')] },
      { name: 'Wide-Grip Lat Pulldown', sets: [s(40, 'lbs', 12, 'little heavy, last 2-3 a lot'), s(45, 'lbs', 8, 'heavy'), s(50, 'lbs', 6, 'heavy, support for last 2')] },
      { name: 'Seated Cable Row', sets: [s(23.8, 'kg', 15, 'easy'), s(26.1, 'kg', 15, 'easy'), s(30.6, 'kg', 15, 'easy')] },
      { name: 'Single-Arm Lat Pulldown', sets: [s(10.2, 'kg', 15, 'easy'), s(12.5, 'kg', 15, 'left hand heavy after 11'), s(14.2, 'kg', 10, 'heavy')] },
      { name: 'Overhead Dumbbell Tricep Extension', sets: [s(15, 'kg', 25, 'very easy'), s(17.5, 'kg', 20, 'easy'), s(20, 'kg', 12, 'little heavy')] },
      { name: 'EZ Bar Skull Crusher', sets: [s(5, 'kg', 20, 'easy'), s(7.5, 'kg', 15, 'heavy last 3'), s(10, 'kg', 10, 'heavy, last 3 too much')] },
      { name: 'Tricep Cable Pushdown', sets: [s(14.7, 'kg', 15, 'easy'), s(17, 'kg', 15, 'easy'), s(19.3, 'kg', 15, 'easy to little heavy')] },
      { name: 'Overhead Cable Tricep Extension', sets: [s(17, 'kg', 15, 'easy'), s(19.3, 'kg', 15, 'easy')] },
    ],
  },
  {
    date: '2026-07-15',
    split: 'Shoulder + Legs',
    notes: null,
    exercises: [
      { name: 'Dragon Fly', sets: [s(2.5, 'kg', 15, 'easy-hard'), s(2.5, 'kg', 12, 'hard to heavy'), s(3.5, 'kg', 6, 'very heavy')] },
      { name: 'Overhead Dumbbell Press', sets: [s(15, 'kg', 15), s(17.5, 'kg', 15), s(20, 'kg', 8)] },
      { name: 'Front Raise (Dumbbell)', sets: [s(5, 'kg', 15), s(7.5, 'kg', 12), s(10, 'kg', 10), s(10, 'kg', 5, 'rest-pause')] },
      { name: 'Lateral Raise (Machine)', sets: [s(40, 'lbs', 15), s(50, 'lbs', 11), s(50, 'lbs', 8, 'rest-pause')] },
      { name: 'Face Pull (Cable)', sets: [s(10.2, 'kg', 15), s(12.5, 'kg', 15), s(14.7, 'kg', 12)] },
      { name: 'Single-Arm Cable Lateral Raise', sets: [s(2.5, 'kg', 15, null, true), s(3.4, 'kg', 15, null, true), s(16, 'kg', 15, null, true)] },
      { name: 'Leg Extension', sets: [s(20, 'kg', 15), s(25, 'kg', 15), s(30, 'kg', 15)] },
      { name: 'Leg Curl', sets: [s(23, 'kg', 15), s(30, 'kg', 9), s(30, 'kg', 10, 'little pressure on lower back')] },
      { name: 'Hip Abductor (Outer)', sets: [s(25, 'lbs', 20), s(30, 'lbs', 20), s(35, 'lbs', 20)] },
      { name: 'Hip Adductor (Inner)', sets: [s(25, 'lbs', 8), s(20, 'lbs', 15), s(25, 'lbs', 15)] },
    ],
  },
]
