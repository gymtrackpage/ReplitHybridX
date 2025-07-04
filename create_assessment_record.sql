
-- Create assessment record for jonathan.lee@mottmac.com
INSERT INTO assessments (
  "userId", 
  data, 
  "hyroxEventsCompleted", 
  "generalFitnessYears", 
  "primaryTrainingBackground", 
  "weeklyTrainingDays", 
  "avgSessionLength", 
  "competitionFormat", 
  age, 
  "injuryHistory", 
  "injuryRecent", 
  goals, 
  "equipmentAccess", 
  "createdAt"
) VALUES (
  'jonathan.lee@mottmac.com',
  '{"completed": true, "retroactiveCreation": true, "createdDate": "2025-01-07"}',
  0,
  2,
  'general',
  3,
  60,
  'singles',
  30,
  false,
  false,
  'general-fitness',
  'full_gym',
  NOW()
);
