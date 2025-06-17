# Bumblebee: Streamlined Compliance Automation

![alt text](image.png)


## Revolutionizing Your Compliance Journey

Bumblebee is a comprehensive platform designed to simplify and automate your organization's compliance processes. Say goodbye to scattered spreadsheets, manual tracking, and the overwhelming complexity of meeting regulatory and internal standards. With Bumblebee, you gain a centralized, efficient, and transparent way to manage compliance from end to end.

Our intuitive interface and powerful features empower compliance teams, auditors, and task owners to collaborate effectively, ensuring that your organization stays on top of its obligations with less effort and greater accuracy.

## Key Features & Benefits for Your Organization

*   **Centralized Compliance Library:**
    *   Manage all your compliance standards (e.g., ISO 27001, SOC 2, HIPAA, GDPR, NYDFS), their specific requirements, and associated master tasks in one place.
    *   Easily create, update, and version your internal controls and procedures.
*   **Powerful Campaign Management:**
    *   Launch targeted compliance campaigns for specific standards or timeframes.
    *   Select applicable requirements for each campaign and automatically generate task instances.
    *   Track campaign progress, due dates, and overall status at a glance.
*   **Efficient Task Management:**
    *   Assign tasks to individuals or teams, set priorities, and define due dates.
    *   Users get a clear view of their assigned tasks ("My Tasks") and their responsibilities.
    *   Automate certain checks through system integrations, reducing manual effort.
*   **Streamlined Evidence Collection & Review:**
    *   Task owners can easily upload various forms of evidence (files, links, text).
    *   Auditors and admins have a dedicated "Pending Review" queue to efficiently review and approve/reject submitted evidence.
    *   Maintain a clear audit trail of evidence submissions and reviews.
*   **Insightful Dashboards & Reporting:**
    *   Visualize your compliance posture with interactive dashboards showing task status, campaign progress, and overdue items.
    *   (Future) Generate comprehensive reports for stakeholders and auditors.
*   **System Integrations:**
    *   Connect Bumblebee to your existing systems (AWS, Azure, GitHub, Databases, Generic APIs, etc.) to automate data collection for certain tasks.
    *   Pre-defined configuration templates for common system types make setup easier.
*   **Role-Based Access Control:**
    *   Clearly defined roles (Admin, Auditor, User) ensure that individuals only have access to the information and functionalities relevant to their responsibilities.
*   **Collaboration & Communication:**
    *   Leave comments on tasks for clarification or discussion.
    *   (Future) Notifications and alerts for due dates and status changes.

## Who is Bumblebee For?

*   **Compliance Officers & Managers:** To orchestrate compliance programs, launch campaigns, and monitor overall adherence.
*   **Internal & External Auditors:** To efficiently review evidence, track remediation efforts, and assess compliance.
*   **IT & Security Teams:** To manage technical controls, complete assigned tasks, and provide necessary evidence.
*   **Task Owners:** To understand their responsibilities, submit evidence, and track their progress.
*   **Any Organization** looking to improve its compliance efficiency, reduce risk, and foster a culture of continuous compliance.

## Getting Started with Bumblebee (Demo Overview)
Bumblebee is designed to be intuitive. Here's a typical flow for setting up and using the platform:

1.  **Define Your Library (Admin/Auditor):**
    *   **Standards:** Input the compliance standards your organization adheres to (e.g., "ISO 27001:2022", "Internal Security Policy v1.3").
    *   **Requirements:** For each standard, detail the specific requirements or controls (e.g., "A.5.1 Information security policies", "NYDFS 500.02 Cybersecurity Program").
    *   **Master Tasks:** Create reusable task templates for each requirement, outlining the actions needed, expected evidence, default priority, and even automated check configurations.
2.  **Configure System Integrations (Admin):**
    *   Connect Bumblebee to relevant systems (cloud providers, code repositories, vulnerability scanners) to enable automated evidence collection for specific tasks.
3.  **Manage Users & Teams (Admin):**
    *   Add users and assign them appropriate roles (Admin, Auditor, User).
    *   Create teams to group users for easier task assignment (e.g., "IT Operations", "Security Team").
4.  **Launch a Compliance Campaign (Admin/Auditor):**
    *   Create a new campaign (e.g., "Q3 ISO 27001 Audit", "Annual PCI DSS Review").
    *   Select the relevant standard and choose which of its requirements are applicable to this campaign.
    *   Set start and end dates for the campaign.
    *   Upon activation, Bumblebee automatically generates task instances from your master tasks for all applicable requirements.
5.  **Work on Tasks (All Users):**
    *   Users see their assigned tasks in their "My Tasks" view.
    *   They can view task details, understand requirements, and submit evidence (upload files, provide links, or write text).
    *   If a task is automated, users can trigger the execution and view results.
6.  **Review Evidence (Auditor/Admin):**
    *   Tasks with submitted evidence move to the "Pending Review" queue.
    *   Auditors/Admins can review the evidence, add comments, and approve or reject it.
7.  **Monitor Progress (All Users, especially Admin/Auditor):**
    *   The Dashboard provides an overview of task statuses, campaign progress, and any overdue items.
    *   Drill down into specific campaigns or tasks for more details.

## Technical Setup (For Administrators)

For setting up the Bumblebee environment, please refer to the technical setup guide below.

### Prerequisites
*   Docker
*   Go (for backend development/running locally without Docker for backend)
*   Node.js & npm/yarn (for frontend development/running locally)

### Database Setup (PostgreSQL with Docker)

1.  **Pull and Start PostgreSQL Container:**
    ```sh
    docker pull postgres
    docker run --name bumblebee-db -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres
    ```
    *(Note: `bumblebee-db` is used here instead of `mypostgres` for clarity)*

2.  **Create the Database:**
    Connect to the default `postgres` database to create the `compliance` database.
    ```sh
    docker exec -it bumblebee-db psql -U postgres -c "CREATE DATABASE compliance;"
    ```

3.  **Apply Database Schema:**
    Ensure `db.sql` (containing your table definitions) is in your project's root or a known location.
    ```sh
    docker cp ./path/to/your/db.sql bumblebee-db:/tmp/db.sql
    docker exec -it bumblebee-db psql -U postgres -d compliance -f /tmp/db.sql
    ```

4.  **(Optional) Populate Sample Data:**
    If you have a `sample_data.sql` file:
    ```sh
    docker cp sample_data.sql mypostgres:/tmp/sample_data.sql
    docker exec -it mypostgres psql -U postgres -d compliance -f /tmp/sample_data.sql
    ```

### Running the Application

*   **Backend (Go):**
    *   Navigate to the `backend` directory.
    *   Set required environment variables (e.g., `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT`, `JWT_SECRET_KEY`).
    *   Run `go run main.go`.
*   **Frontend (React):**
    *   Navigate to the `frontend` directory.
    *   Run `npm install` (or `yarn install`).
    *   Run `npm start` (or `yarn start`).

postgres://postgres:mysecretpassword@localhost:5432/compliance?sslmode=disable


# Running Makefile
- `make build-ui` (or make build-all which includes it) to build your frontend.
- `make docker-build` (or make build-all) to build the backend Docker images.
- make up to start all services.
- Access your app at http://localhost:8080.
- `make logs` to view logs.
- `make down` to stop services.
- `make clean` to stop services and remove the database volume (data will be lost).
- `make fresh-start` for a complete reset and restart.


### Getting into Docker DB
```sh
docker exec -it compliance_postgres sh
psql -U compliance_user -d compliance_db
```