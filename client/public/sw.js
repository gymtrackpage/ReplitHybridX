const CACHE_NAME = 'hybrid-x-v3';
const STATIC_CACHE = 'hybrid-x-static-v3';
const DYNAMIC_CACHE = 'hybrid-x-dynamic-v3';
const WORKOUT_CACHE = 'hybrid-x-workouts-v3';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo-x.png',
  '/logo-full.png',
  '/icon-192.png',
  '/icon-512.png',
  '/splash-screen.png'
];

// Workout-related URLs to cache for offline access
const WORKOUT_URLS = [
  '/api/today-workout',
  '/api/upcoming-workouts', 
  '/api/recent-workouts',
  '/api/generate-random-workout'
];

// Install event - cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests for caching
  if (event.request.method !== 'GET') {
    // Handle POST requests for offline workout generation
    if (event.request.method === 'POST' && event.request.url.includes('/api/generate-random-workout')) {
      event.respondWith(handleOfflineWorkoutGeneration(event.request));
      return;
    }
    return;
  }

  // Handle workout API requests with special offline support
  if (isWorkoutRelatedURL(event.request.url)) {
    event.respondWith(handleWorkoutRequest(event.request));
    return;
  }

  // Handle other API requests with network-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API responses for offline access
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        
        // If not in cache, fetch from network and cache it
        return fetch(event.request)
          .then(function(response) {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

// Check if URL is workout-related
function isWorkoutRelatedURL(url) {
  return WORKOUT_URLS.some(workoutUrl => url.includes(workoutUrl));
}

// Handle workout requests with offline fallback
async function handleWorkoutRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful workout responses
      const cache = await caches.open(WORKOUT_CACHE);
      await cache.put(request, response.clone());
      
      // Store in IndexedDB for better offline access
      if (request.url.includes('/api/today-workout')) {
        const data = await response.clone().json();
        await storeWorkoutData('today-workout', data);
      }
      
      return response;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed, trying cache/offline for:', request.url);
    
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Generate offline workout if today's workout is requested
    if (request.url.includes('/api/today-workout')) {
      return await generateOfflineTodayWorkout();
    }
    
    // Return empty array for other workout endpoints
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle offline workout generation
async function handleOfflineWorkoutGeneration(request) {
  try {
    // Try network first
    const response = await fetch(request);
    if (response.ok) {
      return response;
    }
    throw new Error('Network failed');
  } catch (error) {
    console.log('Generating offline random workout');
    const offlineWorkout = generateOfflineRandomWorkout();
    return new Response(JSON.stringify(offlineWorkout), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Generate offline random workout
function generateOfflineRandomWorkout() {
  const workoutTypes = ['Strength Focus', 'Cardio Blast', 'Mixed Training', 'HYROX Prep'];
  const exercises = [
    { name: 'Push-ups', reps: '15-20', type: 'Strength' },
    { name: 'Air Squats', reps: '20-25', type: 'Strength' },
    { name: 'Mountain Climbers', duration: '30s', type: 'Cardio' },
    { name: 'Plank Hold', duration: '45s', type: 'Core' },
    { name: 'Burpees', reps: '10-15', type: 'Cardio' },
    { name: 'Lunges', reps: '12 each leg', type: 'Strength' },
    { name: 'High Knees', duration: '30s', type: 'Cardio' },
    { name: 'Russian Twists', reps: '20', type: 'Core' },
    { name: 'Jumping Jacks', reps: '25', type: 'Cardio' },
    { name: 'Wall Sit', duration: '30s', type: 'Strength' }
  ];

  const workoutType = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
  const selectedExercises = [];
  
  // Select 4-6 random exercises
  const exerciseCount = 4 + Math.floor(Math.random() * 3);
  const shuffled = exercises.sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < exerciseCount; i++) {
    selectedExercises.push(shuffled[i]);
  }

  return {
    name: `Offline ${workoutType}`,
    description: 'Bodyweight workout generated offline - perfect for limited equipment!',
    estimatedDuration: 20 + Math.floor(Math.random() * 20),
    exercises: selectedExercises,
    workoutType: 'mixed',
    structure: 'Circuit Training',
    isOffline: true
  };
}

// Generate offline today's workout
async function generateOfflineTodayWorkout() {
  // Try to get stored workout first
  const storedWorkout = await getStoredWorkoutData('today-workout');
  if (storedWorkout) {
    return new Response(JSON.stringify(storedWorkout), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Generate a simple daily workout
  const dailyWorkout = {
    id: Date.now(),
    name: 'Offline Daily Training',
    description: 'Your offline daily workout - stay consistent even without connection!',
    estimatedDuration: 25,
    workoutType: 'mixed',
    week: Math.floor((Date.now() / (1000 * 60 * 60 * 24 * 7)) % 12) + 1,
    day: (new Date().getDay() || 7), // 1-7, with Sunday as 7
    exercises: [
      { name: 'Warm-up Jog in Place', duration: '3 minutes', type: 'Cardio' },
      { name: 'Push-ups', sets: 3, reps: '8-12', restBetweenSets: 60, type: 'Strength' },
      { name: 'Air Squats', sets: 3, reps: '15-20', restBetweenSets: 60, type: 'Strength' },
      { name: 'Mountain Climbers', sets: 3, duration: '30s', restBetweenSets: 45, type: 'Cardio' },
      { name: 'Plank Hold', sets: 2, duration: '45s', restBetweenSets: 60, type: 'Core' },
      { name: 'Burpees', sets: 2, reps: '5-8', restBetweenSets: 90, type: 'Full Body' },
      { name: 'Cool-down Stretching', duration: '5 minutes', type: 'Flexibility' }
    ],
    isOffline: true
  };

  return new Response(JSON.stringify(dailyWorkout), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// IndexedDB helpers for storing workout data
async function storeWorkoutData(key, data) {
  try {
    const db = await openWorkoutDB();
    const transaction = db.transaction(['workouts'], 'readwrite');
    const store = transaction.objectStore('workouts');
    await store.put({ id: key, data: data, timestamp: Date.now() });
  } catch (error) {
    console.error('Failed to store workout data:', error);
  }
}

async function getStoredWorkoutData(key) {
  try {
    const db = await openWorkoutDB();
    const transaction = db.transaction(['workouts'], 'readonly');
    const store = transaction.objectStore('workouts');
    const result = await store.get(key);
    
    // Return data if it's less than 24 hours old
    if (result && (Date.now() - result.timestamp) < 24 * 60 * 60 * 1000) {
      return result.data;
    }
  } catch (error) {
    console.error('Failed to get stored workout data:', error);
  }
  return null;
}

function openWorkoutDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('HybridXWorkouts', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('workouts')) {
        db.createObjectStore('workouts', { keyPath: 'id' });
      }
    };
  });
}

// Background sync for offline actions
self.addEventListener('sync', function(event) {
  if (event.tag === 'workout-sync') {
    event.waitUntil(syncWorkoutData());
  }
  if (event.tag === 'workout-completion-sync') {
    event.waitUntil(syncWorkoutCompletions());
  }
});

// Push notifications
self.addEventListener('push', function(event) {
  const options = {
    body: event.data ? event.data.text() : 'New workout available!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'workout-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification('HybridX Training', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Sync workout data when back online
async function syncWorkoutData() {
  try {
    // Get pending workouts from IndexedDB
    const db = await openWorkoutDB();
    const transaction = db.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');
    const pendingWorkouts = await store.getAll();
    
    for (const item of pendingWorkouts) {
      try {
        await fetch('/api/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data)
        });
        
        // Remove from pending after successful sync
        const deleteTransaction = db.transaction(['pendingActions'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('pendingActions');
        await deleteStore.delete(item.id);
      } catch (error) {
        console.error('Failed to sync workout:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Sync workout completions when back online
async function syncWorkoutCompletions() {
  try {
    const pendingCompletions = JSON.parse(localStorage.getItem('pendingCompletions') || '[]');
    
    for (const completion of pendingCompletions) {
      try {
        await fetch('/api/workout-completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(completion)
        });
      } catch (error) {
        console.error('Failed to sync completion:', error);
      }
    }
    
    // Clear pending completions after successful sync
    localStorage.removeItem('pendingCompletions');
  } catch (error) {
    console.error('Completion sync failed:', error);
  }
}