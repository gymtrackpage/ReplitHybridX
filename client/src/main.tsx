import { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BottomNav } from './components/BottomNav'
import { WorkoutCard } from './components/WorkoutCard'

interface User {
  id: string;
  email: string;
}

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  weight?: number;
}

interface Workout {
  id: number;
  name: string;
  description: string;
  duration: number;
  exercises: Exercise[];
  difficulty: string;
  completed?: boolean;
}

interface Program {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  targetEventWeeks: number;
  category: string;
}

interface UserStats {
  completedWorkouts: number;
  totalWorkouts: number;
  currentStreak: number;
  weeklyProgress: number;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #e2e8f0',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '48px 16px'
      }}>
        <div style={{
          maxWidth: '448px',
          width: '100%',
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '30px',
            fontWeight: '800',
            color: '#111827'
          }}>
            Welcome to Hybrid X
          </h2>
          <p style={{
            marginTop: '8px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            Your personal HYROX training companion
          </p>
          <div style={{ marginTop: '32px' }}>
            <button
              onClick={handleLogin}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                padding: '8px 16px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '6px',
                color: 'white',
                backgroundColor: '#2563eb',
                cursor: 'pointer'
              }}
            >
              Sign in with Replit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user!} />;
      case 'programs':
        return <ProgramsPage />;
      case 'workouts':
        return <WorkoutsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'profile':
        return <ProfilePage user={user!} onLogout={handleLogout} />;
      default:
        return <Dashboard user={user!} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {renderCurrentTab()}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// Enhanced Dashboard Component
function Dashboard({ user }: { user: User }) {
  const [todaysWorkouts, setTodaysWorkouts] = useState<Workout[]>([]);
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [stats, setStats] = useState<UserStats>({
    completedWorkouts: 0,
    totalWorkouts: 0,
    currentStreak: 0,
    weeklyProgress: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch today's workouts
      const workoutsResponse = await fetch('/api/workouts/today', {
        credentials: 'include'
      });
      if (workoutsResponse.ok) {
        const workouts = await workoutsResponse.json();
        setTodaysWorkouts(workouts);
      }

      // Fetch current program
      const programResponse = await fetch('/api/programs/current', {
        credentials: 'include'
      });
      if (programResponse.ok) {
        const program = await programResponse.json();
        setCurrentProgram(program);
      }

      // Fetch user stats
      const statsResponse = await fetch('/api/users/stats', {
        credentials: 'include'
      });
      if (statsResponse.ok) {
        const userStats = await statsResponse.json();
        setStats(userStats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = (workoutId: number) => {
    alert(`Starting workout ${workoutId}. Workout session feature available in full version.`);
  };

  const handleCompleteWorkout = (workoutId: number) => {
    alert(`Viewing workout results for ${workoutId}. Results tracking available in full version.`);
  };

  const generateRandomWorkout = async () => {
    try {
      const response = await fetch('/api/workouts/random', {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        const workout = await response.json();
        alert(`Generated: ${workout.name}\nDuration: ${workout.estimatedDuration} minutes\nType: ${workout.workoutType}`);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to generate workout:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid #e2e8f0',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px 16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Welcome back, {user.email.split('@')[0]}!
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Ready to crush your HYROX training today?
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        {/* Quick Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#3b82f6'
            }}>
              {stats.currentStreak}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              Day Streak
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#10b981'
            }}>
              {Math.round(stats.weeklyProgress)}%
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              Week Progress
            </div>
          </div>
        </div>

        {/* Current Program */}
        {currentProgram && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827'
              }}>
                Current Program
              </h2>
              <span style={{
                fontSize: '12px',
                padding: '4px 8px',
                borderRadius: '12px',
                backgroundColor: '#dbeafe',
                color: '#1e40af'
              }}>
                {currentProgram.difficulty}
              </span>
            </div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              {currentProgram.name}
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '14px',
              marginBottom: '16px'
            }}>
              {currentProgram.description}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {currentProgram.targetEventWeeks} weeks • {currentProgram.category}
              </span>
              <button style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}>
                View Program
              </button>
            </div>
          </div>
        )}

        {/* Today's Workouts */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px'
          }}>
            Today's Workouts
          </h2>
          
          {todaysWorkouts.length > 0 ? (
            todaysWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onStart={() => handleStartWorkout(workout.id)}
                onComplete={() => handleCompleteWorkout(workout.id)}
              />
            ))
          ) : (
            <div style={{
              backgroundColor: 'white',
              padding: '40px 20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                🎉
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px'
              }}>
                No workouts scheduled
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                You've completed all your workouts for today!
              </p>
              <button
                onClick={generateRandomWorkout}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Generate Random Workout
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          <button
            onClick={() => setActiveTab('calendar')}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              padding: '20px',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div style={{
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              📊
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              View Progress
            </div>
          </button>
          
          <button
            onClick={generateRandomWorkout}
            style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              padding: '20px',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center'
            }}
          >
            <div style={{
              fontSize: '24px',
              marginBottom: '8px'
            }}>
              ⚡
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Quick Workout
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Programs Page
function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/programs', { credentials: 'include' });
      if (response.ok) {
        const programData = await response.json();
        setPrograms(programData);
      }
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProgram = async (programId: number) => {
    try {
      const response = await fetch('/api/programs/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ programId })
      });
      if (response.ok) {
        alert('Program selected successfully!');
      }
    } catch (error) {
      console.error('Failed to select program:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingBottom: '80px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px 16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Training Programs
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Choose a HYROX program that fits your fitness level
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '2px solid #e2e8f0',
              borderTop: '2px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : programs.length > 0 ? (
          programs.map((program) => (
            <div key={program.id} style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '8px'
                  }}>
                    {program.name}
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: program.difficulty === 'Beginner' ? '#10b981' : program.difficulty === 'Intermediate' ? '#f59e0b' : '#ef4444',
                      color: 'white',
                      fontWeight: '500'
                    }}>
                      {program.difficulty}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {program.targetEventWeeks} weeks
                    </span>
                  </div>
                </div>
              </div>
              <p style={{
                color: '#6b7280',
                fontSize: '14px',
                marginBottom: '16px',
                lineHeight: '1.5'
              }}>
                {program.description}
              </p>
              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                <button
                  onClick={() => selectProgram(program.id)}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Select Program
                </button>
                <button style={{
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}>
                  View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            backgroundColor: 'white',
            padding: '40px 20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px'
            }}>
              No Programs Available
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Programs will be loaded from your training database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced Workouts Page
function WorkoutsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingBottom: '80px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px 16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Workouts
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Your workout history and performance tracking
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px 20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            💪
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Workout Library
          </h3>
          <p style={{
            color: '#6b7280',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            Access your workout history and track your performance metrics.
          </p>
          <button style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            View All Workouts
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Calendar Page
function CalendarPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingBottom: '80px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px 16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Training Calendar
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Track your progress and upcoming sessions
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px 20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            📅
          </div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Calendar View
          </h3>
          <p style={{
            color: '#6b7280',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            View your training schedule and track your progress over time.
          </p>
          <button style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            Open Calendar
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Profile Page
function ProfilePage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      paddingBottom: '80px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px 16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px'
          }}>
            Profile
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Manage your account and training preferences
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '20px 16px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px'
          }}>
            Account Information
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: '600',
              marginRight: '16px'
            }}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                color: '#111827',
                marginBottom: '4px'
              }}>
                {user.email.split('@')[0]}
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);