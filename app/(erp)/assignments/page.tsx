"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { theme } from "../../components/theme";
import useOrgContext from "../../hooks/useOrgContext";

interface AssignmentDeal {
  id: string;
  name: string;
  address: string;
}

interface AssignmentTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  completedAt: string | null;
  milestone: {
    id: string;
    title: string;
    dealId: string;
    deal: AssignmentDeal;
  };
}

interface AssignmentMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: string;
  roomId: string | null;
  deal: AssignmentDeal;
  tasks: {
    id: string;
    title: string;
    completed: boolean;
    dueDate: string | null;
  }[];
}

interface Assignments {
  milestones: AssignmentMilestone[];
  tasks: AssignmentTask[];
}

export default function AssignmentsPage() {
  const router = useRouter();
  const { role } = useOrgContext();
  const isFieldWorker = role === "field_worker";
  const pageHeading = role === "field_worker" ? "My Jobs"
    : role === "site_supervisor" ? "My Tasks"
    : role === "project_manager" ? "Task Board"
    : "My Work";
  const pageSubtitle = role === "field_worker" ? "Your tasks for today and upcoming"
    : role === "site_supervisor" ? "Tasks and milestones across your sites"
    : role === "project_manager" ? "All team tasks and milestones"
    : "Milestones and tasks assigned to you across all projects";
  const [data, setData] = useState<Assignments | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/assignments");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently handle fetch failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      fetchAssignments();
    } catch {
      // Silently handle toggle failure
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, color: theme.textDim }}>Loading assignments...</div>
    );
  }

  const milestones = data?.milestones || [];
  const standaloneTasks = data?.tasks || [];

  // Group milestones by project
  const byProject: Record<string, { deal: AssignmentDeal; milestones: AssignmentMilestone[]; tasks: AssignmentTask[] }> = {};

  for (const ms of milestones) {
    const key = ms.deal.id;
    if (!byProject[key]) byProject[key] = { deal: ms.deal, milestones: [], tasks: [] };
    byProject[key].milestones.push(ms);
  }

  // Group standalone tasks by project (tasks not already covered by assigned milestones)
  const assignedMilestoneIds = new Set(milestones.map((m) => m.id));
  for (const task of standaloneTasks) {
    if (assignedMilestoneIds.has(task.milestone.id)) continue; // already shown under milestone
    const key = task.milestone.deal.id;
    if (!byProject[key]) byProject[key] = { deal: task.milestone.deal, milestones: [], tasks: [] };
    byProject[key].tasks.push(task);
  }

  const projects = Object.values(byProject);
  const hasAssignments = projects.length > 0;

  const statusColors: Record<string, string> = {
    pending: theme.textDim, in_progress: theme.accent, completed: theme.green, overdue: theme.red, skipped: theme.textDim,
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  };

  const isOverdue = (d: string | null, completed?: boolean) => {
    if (!d || completed) return false;
    return new Date(d) < new Date();
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>{pageHeading}</h1>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "4px 0 0" }}>
          {pageSubtitle}
        </p>
      </div>

      {!hasAssignments ? (
        <div style={{
          background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8,
          padding: 40, textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#9745;</div>
          <p style={{ fontSize: 14, color: theme.textDim, margin: 0 }}>No assignments yet</p>
          <p style={{ fontSize: 11, color: theme.textDim, margin: "4px 0 0" }}>
            When a project manager assigns you milestones or tasks, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {projects.map((proj) => (
            <div key={proj.deal.id} style={{
              background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden",
            }}>
              {/* Project header */}
              <div
                onClick={isFieldWorker ? undefined : () => router.push(`/projects/${proj.deal.id}`)}
                style={{
                  padding: "10px 14px", borderBottom: `1px solid ${theme.cardBorder}`,
                  cursor: isFieldWorker ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{proj.deal.name}</span>
                {proj.deal.address && (
                  <span style={{ fontSize: 10, color: theme.textDim }}>{proj.deal.address}</span>
                )}
                {!isFieldWorker && <span style={{ marginLeft: "auto", fontSize: 10, color: theme.accent }}>View Project &rarr;</span>}
              </div>

              <div style={{ padding: "8px 14px 14px" }}>
                {/* Assigned milestones */}
                {proj.milestones.map((ms) => {
                  const color = isOverdue(ms.dueDate, ms.status === "completed") ? theme.red : statusColors[ms.status] || theme.textDim;
                  const tasksDone = ms.tasks.filter((t) => t.completed).length;
                  return (
                    <div key={ms.id} style={{
                      background: theme.input, borderRadius: 4, borderLeft: `3px solid ${color}`,
                      marginBottom: 6, overflow: "hidden",
                    }}>
                      {isFieldWorker ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{ms.title}</span>
                          <span style={{ fontSize: 10, color: theme.textDim, marginLeft: "auto" }}>{proj.deal.name}</span>
                        </div>
                      ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px" }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          background: ms.status === "completed" ? theme.green : `${color}20`,
                          border: `1.5px solid ${color}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, color: ms.status === "completed" ? "#fff" : color, fontWeight: 700, flexShrink: 0,
                        }}>
                          {ms.status === "completed" ? "\u2713" : ""}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{ms.title}</span>
                          {ms.roomId && (
                            <span style={{ fontSize: 8, marginLeft: 6, padding: "1px 5px", borderRadius: 3, background: `${theme.accent}10`, color: theme.accent }}>
                              {ms.roomId}
                            </span>
                          )}
                        </div>
                        {ms.tasks.length > 0 && (
                          <span style={{ fontSize: 9, color: theme.textDim }}>{tasksDone}/{ms.tasks.length}</span>
                        )}
                        {ms.dueDate && (
                          <span style={{
                            fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                            color: isOverdue(ms.dueDate, ms.status === "completed") ? theme.red : theme.textDim,
                          }}>
                            {formatDate(ms.dueDate)}
                          </span>
                        )}
                      </div>
                      )}
                      {ms.tasks.length > 0 && (
                        <div style={{ padding: "0 8px 6px", paddingLeft: 30 }}>
                          {ms.tasks.map((task) => (
                            <div
                              key={task.id}
                              onClick={() => toggleTask(task.id, task.completed)}
                              style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0", cursor: "pointer" }}
                            >
                              <div style={{
                                width: 12, height: 12, borderRadius: 2,
                                border: `1.5px solid ${task.completed ? theme.green : theme.inputBorder}`,
                                background: task.completed ? theme.green : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 7, color: "#fff", flexShrink: 0,
                              }}>{task.completed ? "\u2713" : ""}</div>
                              <span style={{
                                fontSize: 10, flex: 1,
                                color: task.completed ? theme.textDim : theme.text,
                                textDecoration: task.completed ? "line-through" : "none",
                              }}>{task.title}</span>
                              {task.dueDate && (
                                <span style={{
                                  fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
                                  color: isOverdue(task.dueDate, task.completed) ? theme.red : theme.textDim,
                                }}>
                                  {formatDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Standalone assigned tasks (not under an assigned milestone) */}
                {proj.tasks.length > 0 && (
                  <div style={{ marginTop: proj.milestones.length > 0 ? 6 : 0 }}>
                    {proj.milestones.length > 0 && (
                      <div style={{ fontSize: 9, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>
                        Individual Tasks
                      </div>
                    )}
                    {proj.tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                          background: theme.input, borderRadius: 4, marginBottom: 3, cursor: "pointer",
                        }}
                        onClick={() => toggleTask(task.id, task.completed)}
                      >
                        <div style={{
                          width: 12, height: 12, borderRadius: 2,
                          border: `1.5px solid ${task.completed ? theme.green : theme.inputBorder}`,
                          background: task.completed ? theme.green : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 7, color: "#fff", flexShrink: 0,
                        }}>{task.completed ? "\u2713" : ""}</div>
                        <span style={{
                          fontSize: 11, flex: 1,
                          color: task.completed ? theme.textDim : theme.text,
                          textDecoration: task.completed ? "line-through" : "none",
                        }}>{task.title}</span>
                        <span style={{ fontSize: 9, color: theme.textDim }}>{task.milestone.title}</span>
                        {task.dueDate && (
                          <span style={{
                            fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
                            color: isOverdue(task.dueDate, task.completed) ? theme.red : theme.textDim,
                          }}>
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
