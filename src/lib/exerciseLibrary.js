// ~100 common gym exercises, curated and grouped for browsing.
// No exact match to this list is required anywhere — WorkoutEditor keeps
// free-text entry as the source of truth, this only helps people find
// a name faster.

export const GROUPS = ['Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Cardio']

export const EXERCISES = [
  // Chest
  { name: 'Flat Dumbbell Bench Press', group: 'Chest' },
  { name: 'Incline Dumbbell Bench Press', group: 'Chest' },
  { name: 'Decline Dumbbell Bench Press', group: 'Chest' },
  { name: 'Flat Barbell Bench Press', group: 'Chest' },
  { name: 'Incline Barbell Bench Press', group: 'Chest' },
  { name: 'Push-up', group: 'Chest' },
  { name: 'Pec Deck', group: 'Chest' },
  { name: 'Low Cable Chest Fly', group: 'Chest' },
  { name: 'High Cable Chest Fly', group: 'Chest' },
  { name: 'Dumbbell Chest Fly', group: 'Chest' },
  { name: 'Chest Dip', group: 'Chest' },
  { name: 'Landmine Press', group: 'Chest' },

  // Back
  { name: 'Deadlift', group: 'Back' },
  { name: 'Pull-up', group: 'Back' },
  { name: 'Chin-up', group: 'Back' },
  { name: 'Wide-Grip Lat Pulldown', group: 'Back' },
  { name: 'Close-Grip Lat Pulldown', group: 'Back' },
  { name: 'Single-Arm Lat Pulldown', group: 'Back' },
  { name: 'Seated Cable Row', group: 'Back' },
  { name: 'Barbell Row', group: 'Back' },
  { name: 'Single-Arm Dumbbell Row', group: 'Back' },
  { name: 'Upper Back Machine Row', group: 'Back' },
  { name: 'T-Bar Row', group: 'Back' },
  { name: 'Hyperextension', group: 'Back' },
  { name: 'Straight-Arm Pulldown', group: 'Back' },

  // Shoulders
  { name: 'Overhead Dumbbell Press', group: 'Shoulders' },
  { name: 'Overhead Barbell Press', group: 'Shoulders' },
  { name: 'Arnold Press', group: 'Shoulders' },
  { name: 'Front Raise (Dumbbell)', group: 'Shoulders' },
  { name: 'Lateral Raise (Dumbbell)', group: 'Shoulders' },
  { name: 'Lateral Raise (Cable)', group: 'Shoulders' },
  { name: 'Lateral Raise (Machine)', group: 'Shoulders' },
  { name: 'Single-Arm Cable Lateral Raise', group: 'Shoulders' },
  { name: 'Face Pull (Cable)', group: 'Shoulders' },
  { name: 'Rear Delt Fly', group: 'Shoulders' },
  { name: 'Shrug', group: 'Shoulders' },
  { name: 'Upright Row', group: 'Shoulders' },

  // Legs
  { name: 'Barbell Squat', group: 'Legs' },
  { name: 'Front Squat', group: 'Legs' },
  { name: 'Goblet Squat', group: 'Legs' },
  { name: 'Bulgarian Split Squat', group: 'Legs' },
  { name: 'Lunges', group: 'Legs' },
  { name: 'Leg Press', group: 'Legs' },
  { name: 'Leg Extension', group: 'Legs' },
  { name: 'Leg Curl', group: 'Legs' },
  { name: 'Romanian Deadlift', group: 'Legs' },
  { name: 'Hip Thrust', group: 'Legs' },
  { name: 'Hip Abductor (Outer)', group: 'Legs' },
  { name: 'Hip Adductor (Inner)', group: 'Legs' },
  { name: 'Standing Calf Raise', group: 'Legs' },
  { name: 'Seated Calf Raise', group: 'Legs' },

  // Biceps
  { name: 'Dumbbell Bicep Curl', group: 'Biceps' },
  { name: 'Barbell Bicep Curl', group: 'Biceps' },
  { name: 'EZ Bar Curl', group: 'Biceps' },
  { name: 'Cable Bicep Curl', group: 'Biceps' },
  { name: 'Hammer Curl', group: 'Biceps' },
  { name: 'Preacher Curl', group: 'Biceps' },
  { name: 'Concentration Curl', group: 'Biceps' },
  { name: 'Wrist Curl', group: 'Biceps' },

  // Triceps
  { name: 'Overhead Dumbbell Tricep Extension', group: 'Triceps' },
  { name: 'EZ Bar Skull Crusher', group: 'Triceps' },
  { name: 'Tricep Cable Pushdown', group: 'Triceps' },
  { name: 'Overhead Cable Tricep Extension', group: 'Triceps' },
  { name: 'Close-Grip Bench Press', group: 'Triceps' },
  { name: 'Tricep Dip', group: 'Triceps' },
  { name: 'Tricep Kickback', group: 'Triceps' },

  // Core
  { name: 'Plank', group: 'Core' },
  { name: 'Crunch', group: 'Core' },
  { name: 'Russian Twist', group: 'Core' },
  { name: 'Hanging Leg Raise', group: 'Core' },
  { name: 'Dragon Fly', group: 'Core' },
  { name: 'Cable Woodchopper', group: 'Core' },
  { name: 'Ab Wheel Rollout', group: 'Core' },
  { name: 'Side Plank', group: 'Core' },

  // Cardio
  { name: 'Treadmill Run', group: 'Cardio' },
  { name: 'Treadmill Walk (Incline)', group: 'Cardio' },
  { name: 'Cycling', group: 'Cardio' },
  { name: 'Rowing Machine', group: 'Cardio' },
  { name: 'Stairmaster', group: 'Cardio' },
  { name: 'Elliptical', group: 'Cardio' },
  { name: 'Jump Rope', group: 'Cardio' },
]
