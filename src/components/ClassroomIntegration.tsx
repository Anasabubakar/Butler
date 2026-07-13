import React, { useState, useEffect } from "react";
import { GraduationCap, BookOpen, Bell, RefreshCw, Eye, Calendar, User } from "lucide-react";

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  alternateLink?: string;
}

interface CourseWork {
  id: string;
  title: string;
  description?: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  alternateLink?: string;
}

interface ClassroomAnnouncement {
  id: string;
  text: string;
  alternateLink?: string;
  updateTime: string;
}

interface ClassroomIntegrationProps {
  token: string | null;
}

export default function ClassroomIntegration({ token }: ClassroomIntegrationProps) {
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState<string>("");
  const [coursework, setCoursework] = useState<CourseWork[]>([]);
  const [announcements, setAnnouncements] = useState<ClassroomAnnouncement[]>([]);
  const [isFetchingSub, setIsFetchingSub] = useState(false);

  // Fallback high-fidelity classroom mocks
  const mockCourses: ClassroomCourse[] = [
    { id: "class-101", name: "AI Systems Architecture", section: "Fall 2026", descriptionHeading: "Advanced Systems & ML pipelines", room: "Hall B" },
    { id: "class-102", name: "Product Design & UX Craft", section: "Fall 2026", descriptionHeading: "Visual hierarchy and layout patterns", room: "Virtual Rail" }
  ];

  const mockCoursework: Record<string, CourseWork[]> = {
    "class-101": [
      { id: "cw-1", title: "ML Pipeline deployment to production containers", description: "Design an automated script that tests code compilation before final deployment.", dueDate: { year: 2026, month: 8, day: 15 } },
      { id: "cw-2", title: "Vector embeddings and database querying audit", description: "Review indexing models and measure latency parameters on queries.", dueDate: { year: 2026, month: 8, day: 30 } }
    ],
    "class-102": [
      { id: "cw-3", title: "Aesthetic Pairing and font selection strategy", description: "Select display typography and organize bento layouts.", dueDate: { year: 2026, month: 9, day: 5 } }
    ]
  };

  const mockAnnouncements: Record<string, ClassroomAnnouncement[]> = {
    "class-101": [
      { id: "ann-1", text: "Welcome Boss! The first syllabus outline has been synchronized. Read the project description thoroughly.", updateTime: new Date(Date.now() - 86400000).toISOString() }
    ],
    "class-102": [
      { id: "ann-2", text: "Reminder: Live critique session is scheduled for Thursday. Bring layout drafts.", updateTime: new Date().toISOString() }
    ]
  };

  const fetchCourses = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch("https://classroom.googleapis.com/v1/courses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const apiCourses = data.courses || [];
        if (apiCourses.length > 0) {
          setCourses(apiCourses);
        } else {
          setCourses(mockCourses);
        }
      } else {
        setCourses(mockCourses);
      }
    } catch (err) {
      console.error("Error loading classroom courses:", err);
      setCourses(mockCourses);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const handleSelectCourse = async (id: string, name: string) => {
    setSelectedCourseId(id);
    setSelectedCourseName(name);

    if (id.includes("class-")) {
      setCoursework(mockCoursework[id] || []);
      setAnnouncements(mockAnnouncements[id] || []);
      return;
    }

    setIsFetchingSub(true);
    try {
      // Fetch coursework
      const cwRes = await fetch(`https://classroom.googleapis.com/v1/courses/${id}/courseWork`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (cwRes.ok) {
        const cwData = await cwRes.json();
        setCoursework(cwData.courseWork || []);
      }

      // Fetch announcements
      const annRes = await fetch(`https://classroom.googleapis.com/v1/courses/${id}/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.announcements || []);
      }
    } catch (err) {
      console.error("Error fetching classroom course details:", err);
    } finally {
      setIsFetchingSub(false);
    }
  };

  return (
    <div id="classroom-integration-container" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Google Classroom Board
          </h3>
          <p className="text-[11px] text-elegant-muted">Review academic programs, check curriculum coursework, and monitor class notifications</p>
        </div>
        <button
          onClick={fetchCourses}
          disabled={isLoading}
          className="p-2 bg-elegant-card border border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-elegant-gold" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Grid Directory */}
        <div className="bg-elegant-card border border-elegant-border rounded-xl p-4 space-y-2 max-h-[420px] overflow-y-auto text-left">
          <h4 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest mb-3">Enrolled Class Programs</h4>
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => handleSelectCourse(course.id, course.name)}
              className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                selectedCourseId === course.id
                  ? "bg-indigo-500/5 border-indigo-500/40 text-indigo-400"
                  : "bg-elegant-bg/40 border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-semibold truncate">{course.name}</p>
                  <p className="text-[9px] font-mono opacity-60">Section: {course.section || "N/A"}</p>
                </div>
              </div>
              <Eye className="w-3.5 h-3.5 opacity-60" />
            </div>
          ))}
          {courses.length === 0 && !isLoading && (
            <p className="text-xs text-elegant-muted font-mono text-center py-10">No active classrooms detected, Boss.</p>
          )}
        </div>

        {/* Live Assignments & Feed */}
        <div className="lg:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-5 flex flex-col justify-between min-h-[450px]">
          {selectedCourseId ? (
            <div className="space-y-6 flex flex-col justify-between h-full text-left">
              <div className="space-y-5">
                <div className="border-b border-elegant-border/60 pb-3">
                  <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest bg-indigo-500/5 border border-indigo-500/20 px-2 py-0.5 rounded">
                    Active Class Syllabus
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-1">{selectedCourseName}</h4>
                </div>

                {isFetchingSub ? (
                  <div className="py-20 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-400 mx-auto mb-2" />
                    <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Streaming Assignments Feed...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* CourseWork Panel */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Coursework & Projects
                      </h5>
                      <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                        {coursework.map((cw) => (
                          <div key={cw.id} className="bg-elegant-bg/40 border border-elegant-border p-3 rounded-lg text-xs space-y-1">
                            <p className="font-semibold text-white leading-normal">{cw.title}</p>
                            {cw.description && <p className="text-[10px] text-elegant-muted line-clamp-2 leading-relaxed">{cw.description}</p>}
                            {cw.dueDate && (
                              <p className="text-[8px] font-mono text-indigo-300 mt-1.5 uppercase flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                Due Date: {cw.dueDate.year}-{cw.dueDate.month}-{cw.dueDate.day}
                              </p>
                            )}
                          </div>
                        ))}
                        {coursework.length === 0 && (
                          <p className="text-xs text-elegant-muted italic py-4">No assignments scheduled yet, Boss.</p>
                        )}
                      </div>
                    </div>

                    {/* Announcement Feed */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        Class Bulletins
                      </h5>
                      <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                        {announcements.map((ann) => (
                          <div key={ann.id} className="bg-elegant-bg/30 border border-elegant-border/60 p-3 rounded-lg text-[11px] leading-relaxed">
                            <p className="text-white whitespace-pre-wrap">{ann.text}</p>
                            <span className="text-[8px] font-mono text-elegant-muted block mt-2">
                              Posted: {new Date(ann.updateTime).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                        {announcements.length === 0 && (
                          <p className="text-xs text-elegant-muted italic py-4">No announcements posted for this course.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center my-auto py-12">
              <GraduationCap className="w-8 h-8 text-elegant-dark mx-auto mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider text-elegant-muted">
                Select a class program to access coursework, curriculum, and class bulletins.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
