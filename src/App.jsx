import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Download,
  CheckCircle,
  Clock,
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LayoutGrid,
  Cloud,
  Edit2,
  Trash2,
  Plus,
  Copy,
  Save as SaveIcon,
  X,
  Moon,
  Sun,
} from "lucide-react";

// --- Fixed Imports ---
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// --- Configuration (Hardcoded for Local Use) ---
const firebaseConfig = {
  apiKey: "AIzaSyCpEhQYvjG4e4rwpb3PIuoINXmbv1iuDa0",
  authDomain: "ghanuroutine.firebaseapp.com",
  projectId: "ghanuroutine",
  storageBucket: "ghanuroutine.firebasestorage.app",
  messagingSenderId: "480899288152",
  appId: "1:480899288152:web:93f665eb61cba567824e2d",
  measurementId: "G-7R06Q4PKSJ",
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Hardcoded App ID
const appId = "daily-mastery-v1";

// --- Data & Constants ---
const STATUS_OPTIONS = {
  PENDING: { label: "Pending", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300", value: "pending", score: 0 },
  DONE: { label: "Done", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300", value: "done", score: 100 },
  PARTIAL: { label: "Partial", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300", value: "partial", score: 50 },
  MISSED: { label: "Missed", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", value: "missed", score: 0 },
};

const CATEGORY_OPTIONS = ["Routine", "Spiritual", "Study", "Rest", "Work", "Exercise"];

const BASE_SCHEDULE = [
  { time: "04:00 - 04:30", activity: "Freshen up", category: "Routine" },
  { time: "04:30 - 06:30", activity: "Temple", category: "Spiritual" },
  { time: "06:30 - 08:00", activity: "Morning Katha", category: "Spiritual" },
  { time: "08:00 - 09:00", activity: "Main Subject Session 1", category: "Study" },
  { time: "09:00 - 10:00", activity: "Cooking + Breakfast", category: "Routine" },
  { time: "10:00 - 12:00", activity: "Main Subject Session 2", category: "Study" },
  { time: "12:00 - 14:30", activity: "Day Sleep (2.5 hrs)", category: "Rest" },
  { time: "14:30 - 15:00", activity: "Tea + Walk", category: "Rest" },
  { time: "15:00 - 16:00", activity: "Current Affairs + CA MCQs", category: "Study" },
  { time: "16:00 - 17:00", activity: "PYQs & MCQs", category: "Study" },
  { time: "17:00 - 18:00", activity: "Cooking + Eating", category: "Routine" },
  { time: "18:00 - 19:00", activity: "Subject Extension", category: "Study", changeOnDay15: "Quant-Reasoning" },
  { time: "19:00 - 21:00", activity: "Main Subject Session 3", category: "Study" },
  { time: "21:00 - 21:30", activity: "Walk / Relax", category: "Rest" },
  { time: "21:30 - 22:30", activity: "Review, Notes, Error Log", category: "Study" },
  { time: "22:30 - 23:00", activity: "Prepare for Sleep", category: "Routine" },
  { time: "23:00 - 04:00", activity: "Sleep", category: "Rest" },
];

const TOTAL_DAYS = 30;

// --- Helper Functions ---
const getInitialData = () => {
  const initialData = {};
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    initialData[i] = BASE_SCHEDULE.map((slot) => ({
      ...slot,
      activity: i >= 15 && slot.changeOnDay15 ? slot.changeOnDay15 : slot.activity,
      status: "pending",
      notes: "",
    }));
  }
  return initialData;
};

// --- Components ---

const Modal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start space-x-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100 dark:bg-opacity-20`}>
      <Icon size={24} className={color.replace("bg-", "text-").replace("dark:bg-", "dark:text-").split(' ')[0]} />
    </div>
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>}
    </div>
  </div>
);

const ProgressGrid = ({ scheduleData, currentDay, onDayClick }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center">
        <LayoutGrid size={16} className="mr-2" /> 30-Day Overview
      </h3>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
        {Object.keys(scheduleData).map((dayStr) => {
          const day = parseInt(dayStr);
          const slots = scheduleData[day];
          const total = slots.length * 100;
          let current = 0;
          slots.forEach((s) => {
            if (s.status === "done") current += 100;
            if (s.status === "partial") current += 50;
          });
          const percent = Math.round((current / (total || 1)) * 100);

          let colorClass = "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600";
          if (percent > 0) {
            if (percent >= 80) colorClass = "bg-green-100 text-green-700 border-green-200 font-bold dark:bg-green-900/40 dark:text-green-300 dark:border-green-800";
            else if (percent >= 50) colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800";
            else colorClass = "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800";
          }

          const isCurrent = day === currentDay;

          return (
            <button
              key={day}
              onClick={() => onDayClick(day)}
              className={`
                h-10 rounded-md flex items-center justify-center text-xs border transition-all
                ${colorClass}
                ${isCurrent ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-600"}
              `}
              title={`Day ${day}: ${percent}% completed`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function App() {
  const [currentDay, setCurrentDay] = useState(1);
  const [scheduleData, setScheduleData] = useState(getInitialData);
  const [user, setUser] = useState(null);
  const [savingStatus, setSavingStatus] = useState("idle");
  const [isEditing, setIsEditing] = useState(false);

  // --- Dark Mode State ---
  // Initialize state based on local storage or default to false (light)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      return saved === "dark";
    }
    return false;
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // --- Firebase Auth ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
        setSavingStatus("error");
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // --- Firebase Sync ---
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, "artifacts", appId, "users", user.uid, "trackerData", "schedule");

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          setScheduleData((prev) => ({ ...prev, ...remoteData }));
          setSavingStatus("saved");
        } else {
          setDoc(docRef, getInitialData());
          setSavingStatus("saved");
        }
      },
      (error) => {
        console.error("Sync error:", error);
        setSavingStatus("error");
      }
    );

    return () => unsubscribe();
  }, [user]);

  // --- Update Logic ---
  const updateSchedule = async (newData) => {
    setScheduleData(newData);
    if (!user) return;

    setSavingStatus("saving");
    try {
      const docRef = doc(db, "artifacts", appId, "users", user.uid, "trackerData", "schedule");
      await setDoc(docRef, newData, { merge: true });
      setSavingStatus("saved");
    } catch (e) {
      console.error("Save failed", e);
      setSavingStatus("error");
    }
  };

  // --- Field Updates ---
  const handleStatusChange = (day, index, newStatus) => {
    const updatedData = { ...scheduleData };
    updatedData[day][index].status = newStatus;
    updateSchedule(updatedData);
  };

  const handleNoteChange = (day, index, newNote) => {
    const updatedData = { ...scheduleData };
    updatedData[day][index].notes = newNote;
    updateSchedule(updatedData);
  };

  // --- Edit Mode Handlers ---
  const handleSlotEdit = (index, field, value) => {
    const updatedData = { ...scheduleData };
    updatedData[currentDay][index][field] = value;
    updateSchedule(updatedData);
  };

  const addNewSlot = () => {
    const updatedData = { ...scheduleData };
    updatedData[currentDay].push({
      time: "00:00 - 00:00",
      activity: "New Activity",
      category: "Study",
      status: "pending",
      notes: "",
    });
    updateSchedule(updatedData);
  };

  const removeSlot = (index) => {
    const updatedData = { ...scheduleData };
    updatedData[currentDay].splice(index, 1);
    updateSchedule(updatedData);
  };

  const confirmApplyToAll = () => {
    setModalConfig({
      isOpen: true,
      title: "Overwrite All Days?",
      message:
        "This will overwrite the schedule structure for ALL 30 days with today's schedule. Existing progress (Done/Partial) on other days will be reset to 'Pending'. This cannot be undone.",
      onConfirm: applyToAllDays,
    });
  };

  const applyToAllDays = () => {
    const currentStructure = scheduleData[currentDay];
    const newData = {};

    for (let i = 1; i <= TOTAL_DAYS; i++) {
      newData[i] = currentStructure.map((slot) => ({
        ...slot,
        status: "pending", // Reset status
        notes: "", // Reset notes
      }));
    }

    updateSchedule(newData);
    setIsEditing(false);
  };

  // --- Stats ---
  const stats = useMemo(() => {
    const currentDaySlots = scheduleData[currentDay] || [];
    const studySlots = currentDaySlots.filter((s) => s.category === "Study");

    const totalTasks = currentDaySlots.length;
    const completedTasks = currentDaySlots.filter((s) => s.status === "done").length;
    const partialTasks = currentDaySlots.filter((s) => s.status === "partial").length;

    const rawScore = completedTasks * 100 + partialTasks * 50;
    const maxScore = totalTasks * 100 || 100; // Avoid div 0
    const dailyProgress = Math.round((rawScore / maxScore) * 100) || 0;

    const studyTotal = studySlots.length;
    const studyCompleted = studySlots.filter((s) => s.status === "done").length;

    let grandTotalPoints = 0;
    let grandMaxPoints = 0;
    Object.values(scheduleData).forEach((daySlots) => {
      daySlots.forEach((slot) => {
        grandMaxPoints += 100;
        if (slot.status === "done") grandTotalPoints += 100;
        if (slot.status === "partial") grandTotalPoints += 50;
      });
    });
    const totalProgress = Math.round((grandTotalPoints / (grandMaxPoints || 1)) * 100) || 0;

    return { dailyProgress, studyCompleted, studyTotal, totalProgress };
  }, [scheduleData, currentDay]);

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Day,Time,Activity,Category,Status,Notes\n";
    Object.keys(scheduleData).forEach((day) => {
      scheduleData[day].forEach((slot) => {
        csvContent += `${day},"${slot.time}","${slot.activity}","${slot.category}","${slot.status}","${slot.notes}"\n`;
      });
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "study_schedule_backup.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-100 pb-12 transition-colors duration-200">
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
      />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">30-Day Mastery</h1>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:hidden">Tracker</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden sm:flex items-center text-xs font-medium mr-2">
              {savingStatus === "saving" && (
                <span className="text-blue-600 dark:text-blue-400 flex items-center">
                  <Cloud size={14} className="mr-1 animate-pulse" /> Syncing...
                </span>
              )}
              {savingStatus === "saved" && (
                <span className="text-green-600 dark:text-green-400 flex items-center">
                  <Cloud size={14} className="mr-1" /> Saved
                </span>
              )}
              {savingStatus === "error" && (
                <span className="text-red-600 dark:text-red-400 flex items-center">
                  <AlertCircle size={14} className="mr-1" /> Offline
                </span>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                isEditing
                  ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700"
                  : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              }`}
            >
              {isEditing ? (
                <>
                  <SaveIcon size={16} className="mr-2" /> Done
                </>
              ) : (
                <>
                  <Edit2 size={16} className="mr-2" /> Edit
                </>
              )}
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-md text-sm font-medium transition-colors border border-green-200 dark:border-green-800"
            >
              <Download size={16} className="mr-2" /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card
            title="Daily"
            value={`${stats.dailyProgress}%`}
            subtext="Today's Goal"
            icon={BarChart2}
            color={
              stats.dailyProgress >= 80 ? "bg-green-500" : stats.dailyProgress >= 50 ? "bg-yellow-500" : "bg-red-500"
            }
          />
          <Card
            title="Sessions"
            value={`${stats.studyCompleted}/${stats.studyTotal}`}
            subtext="Completed"
            icon={Clock}
            color="bg-blue-500"
          />
          <Card
            title="Overall"
            value={`${stats.totalProgress}%`}
            subtext="30-Day Goal"
            icon={CheckCircle}
            color="bg-purple-500"
          />
          <Card
            title="Phase"
            value={currentDay < 15 ? "Basic" : "Adv"}
            subtext={currentDay < 15 ? "Foundations" : "Quant Added"}
            icon={AlertCircle}
            color="bg-indigo-500"
          />
        </div>

        <ProgressGrid scheduleData={scheduleData} currentDay={currentDay} onDayClick={setCurrentDay} />

        {/* Navigation & Title */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentDay((d) => Math.max(1, d - 1))}
            disabled={currentDay === 1}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-30 transition-colors text-gray-600 dark:text-gray-300"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-900 dark:text-white">Day {currentDay}</span>
            {isEditing && (
              <span className="text-xs text-red-500 dark:text-red-400 font-bold animate-pulse">EDIT MODE ACTIVE</span>
            )}
            {!isEditing && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentDay % 7 === 0 ? "Revision Day" : "Standard Day"}
              </span>
            )}
          </div>

          <button
            onClick={() => setCurrentDay((d) => Math.min(TOTAL_DAYS, d + 1))}
            disabled={currentDay === TOTAL_DAYS}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-30 transition-colors text-gray-600 dark:text-gray-300"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Edit Mode Global Actions */}
        {isEditing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Tip:</strong> Changes made here only affect <strong>Day {currentDay}</strong> unless you use the
              button on the right.
            </div>
            <button
              onClick={confirmApplyToAll}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-md shadow-sm transition-colors"
            >
              <Copy size={16} className="mr-2" /> Apply This Schedule to ALL Days
            </button>
          </div>
        )}

        {/* Main Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th scope="col" className="px-6 py-3 w-32">
                    Time
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Activity
                  </th>
                  <th scope="col" className="px-6 py-3 w-32">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 w-40">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3">
                    Notes
                  </th>
                  {isEditing && (
                    <th scope="col" className="px-6 py-3 w-16">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {scheduleData[currentDay]?.map((slot, index) => (
                  <tr
                    key={`${currentDay}-${index}`}
                    className={`transition-colors ${
                      slot.status === "done" && !isEditing
                        ? "bg-green-50/50 dark:bg-green-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {/* Time Column */}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.time}
                          onChange={(e) => handleSlotEdit(index, "time", e.target.value)}
                          className="w-full p-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      ) : (
                        slot.time
                      )}
                    </td>

                    {/* Activity Column */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={slot.activity}
                          onChange={(e) => handleSlotEdit(index, "activity", e.target.value)}
                          className="w-full p-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      ) : (
                        <div className="font-medium text-gray-800 dark:text-gray-200">{slot.activity}</div>
                      )}
                    </td>

                    {/* Category Column */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          value={slot.category}
                          onChange={(e) => handleSlotEdit(index, "category", e.target.value)}
                          className="w-full p-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                        >
                          {CATEGORY_OPTIONS.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium 
                                            ${
                                              slot.category === "Study"
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"
                                                : slot.category === "Routine"
                                                ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                                : slot.category === "Rest"
                                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200"
                                                : "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200"
                                            }`}
                        >
                          {slot.category}
                        </span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4">
                      <select
                        disabled={isEditing}
                        value={slot.status}
                        onChange={(e) => handleStatusChange(currentDay, index, e.target.value)}
                        className={`
                                            block w-full p-2 rounded-md text-xs font-semibold border-none focus:ring-2 focus:ring-offset-1 cursor-pointer outline-none transition-all
                                            ${
                                              isEditing
                                                ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                                                : ""
                                            }
                                            ${
                                              slot.status === "done"
                                                ? "bg-green-100 text-green-700 focus:ring-green-500 dark:bg-green-900/50 dark:text-green-300"
                                                : slot.status === "missed"
                                                ? "bg-red-100 text-red-700 focus:ring-red-500 dark:bg-red-900/50 dark:text-red-300"
                                                : slot.status === "partial"
                                                ? "bg-yellow-100 text-yellow-700 focus:ring-yellow-500 dark:bg-yellow-900/50 dark:text-yellow-300"
                                                : "bg-gray-100 text-gray-600 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-300"
                                            }
                                        `}
                      >
                        <option value="pending">○ Pending</option>
                        <option value="done">● Done</option>
                        <option value="partial">◑ Partial</option>
                        <option value="missed">✕ Missed</option>
                      </select>
                    </td>

                    {/* Notes Column */}
                    <td className="px-6 py-4">
                      <input
                        disabled={isEditing}
                        type="text"
                        value={slot.notes}
                        onChange={(e) => handleNoteChange(currentDay, index, e.target.value)}
                        placeholder={isEditing ? "Disabled while editing" : "Add details..."}
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 focus:outline-none px-1 py-1 transition-colors text-gray-600 dark:text-gray-300 disabled:text-gray-400 dark:disabled:text-gray-600 dark:placeholder-gray-600"
                      />
                    </td>

                    {/* Delete Action */}
                    {isEditing && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => removeSlot(index)}
                          className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete slot"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Button */}
            {isEditing && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                <button
                  onClick={addNewSlot}
                  className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-sm text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
                >
                  <Plus size={18} className="mr-2" /> Add New Activity Slot
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}