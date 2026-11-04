document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const teacherHint = document.getElementById("teacher-hint");
  const authStatus = document.getElementById("auth-status");
  const messageDiv = document.getElementById("message");
  let isTeacher = false;

  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove("hidden");
  }

  async function responseData(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || "An error occurred");
    }
    return data;
  }

  function renderAuthState() {
    loginForm.classList.toggle("hidden", isTeacher);
    logoutButton.classList.toggle("hidden", !isTeacher);
    signupForm.classList.toggle("hidden", !isTeacher);
    teacherHint.classList.toggle("hidden", isTeacher);
    authStatus.textContent = isTeacher
      ? "Signed in as a teacher. You can manage registrations."
      : "Sign in as a teacher to manage activity registrations.";
  }

  async function refreshAuth() {
    try {
      const response = await fetch("/auth/me");
      if (response.ok) {
        isTeacher = true;
        renderAuthState();
        return;
      }

      isTeacher = false;
      renderAuthState();
      if (response.status !== 401) {
        const data = await response.json().catch(() => ({}));
        authStatus.textContent =
          data.detail || "Could not verify teacher sign-in.";
      }
    } catch (error) {
      isTeacher = false;
      renderAuthState();
      authStatus.textContent = "Could not connect to the server.";
      console.error("Error checking teacher session:", error);
    }
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await responseData(response);
      activitiesList.replaceChildren();

      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("article");
        activityCard.className = "activity-card";

        const title = document.createElement("h4");
        title.textContent = name;
        activityCard.appendChild(title);

        const description = document.createElement("p");
        description.textContent = details.description;
        activityCard.appendChild(description);

        const schedule = document.createElement("p");
        schedule.textContent = `Schedule: ${details.schedule}`;
        activityCard.appendChild(schedule);

        const spotsLeft =
          details.max_participants - details.participants.length;
        const availability = document.createElement("p");
        availability.textContent = `Availability: ${spotsLeft} spots left`;
        activityCard.appendChild(availability);

        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants-container";
        const participantsTitle = document.createElement("h5");
        participantsTitle.textContent = "Participants:";
        participantsContainer.appendChild(participantsTitle);

        if (details.participants.length > 0) {
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;
            participant.appendChild(participantEmail);

            if (isTeacher) {
              const removeButton = document.createElement("button");
              removeButton.type = "button";
              removeButton.className = "delete-btn";
              removeButton.textContent = "Unregister";
              removeButton.setAttribute(
                "aria-label",
                `Unregister ${email} from ${name}`
              );
              removeButton.addEventListener("click", () =>
                handleUnregister(name, email)
              );
              participant.appendChild(removeButton);
            }

            participantsList.appendChild(participant);
          });
          participantsContainer.appendChild(participantsList);
        } else {
          const emptyParticipants = document.createElement("p");
          emptyParticipants.textContent = "No participants yet";
          participantsContainer.appendChild(emptyParticipants);
        }

        activityCard.appendChild(participantsContainer);
        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.textContent =
        "Failed to load activities. Please try again later.";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(activity, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await responseData(response);
      showMessage(messageDiv, result.message, "success");
      await fetchActivities();
    } catch (error) {
      if (error.message === "Teacher login required") {
        isTeacher = false;
        renderAuthState();
      }
      showMessage(messageDiv, error.message, "error");
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      await responseData(
        await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })
      );
      loginForm.reset();
      await refreshAuth();
      await fetchActivities();
      showMessage(messageDiv, "Signed in successfully.", "success");
    } catch (error) {
      showMessage(messageDiv, error.message, "error");
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await responseData(await fetch("/auth/logout", { method: "POST" }));
      isTeacher = false;
      renderAuthState();
      await fetchActivities();
      showMessage(messageDiv, "Signed out.", "success");
    } catch (error) {
      showMessage(messageDiv, error.message, "error");
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await responseData(response);
      showMessage(messageDiv, result.message, "success");
      signupForm.reset();
      await fetchActivities();
    } catch (error) {
      if (error.message === "Teacher login required") {
        isTeacher = false;
        renderAuthState();
      }
      showMessage(messageDiv, error.message, "error");
    }
  });

  renderAuthState();
  refreshAuth().then(fetchActivities);
});
