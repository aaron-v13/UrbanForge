# UrbanForge: Full-Stack Integration & Final Technical Report

**Project:** UrbanForge – 3D Web City-Building Simulator  
**Group:** Group-7  
**Focus:** Full-Stack Integration (HTML5, CSS3, JavaScript ES6+, Three.js, Node.js, Express.js, MongoDB & Mongoose)  
**Date:** November 2026  

---

## 1. Executive Summary

UrbanForge has successfully transitioned from a frontend prototype into a **production-ready, fully functional full-stack web application**. The platform seamlessly marries rich interactive 3D client-side graphics (powered by Three.js and WebGL) with an enterprise-grade Model-View-Controller (MVC) Node.js/Express backend, backed by persistent cloud and local database storage via MongoDB Atlas and Mongoose ODM.

### Key Milestones Achieved:
* **Complete Frontend Delivery:** Responsive 3D simulation canvas, intuitive building drawer with 12 custom GLTF/GLB models, real-time urban metrics panel (happiness, pollution, water, power, budget), interactive transform controls, and comprehensive documentation/auth pages.
* **Full-Stack Data Flow & API Connectivity:** Real-time bidirectional data flow connecting user authentication, session security, dynamic profile rendering, and live city layout persistence.
* **Database Architecture via Mongoose:** Persistent MongoDB schemas for user authentication (`User`) and granular 3D building placements (`Building`), supplemented by a self-healing local JSON storage fallback to guarantee 100% operational uptime.
* **Template Engine Integration:** Server-side rendered diagnostics view utilizing **EJS**, satisfying academic rubric criteria for template engine implementation alongside static asset serving.
* **Robust Security & Session Management:** Password hashing via `bcryptjs`, cryptographically secure session cookies (`express-session`), CORS whitelisting, and strict input validation.

---

## 2. Project Architecture & Technical Stack

```
UrbanForge Full-Stack Architecture
+---------------------------------------------------------------------------------------+
|                                    CLIENT LAYER                                       |
|  Three.js 3D Viewport (WebGL)  |  Dynamic Auth UI (auth.js)  |  Responsive HTML5/CSS3  |
+---------------------------------------------------------------------------------------+
                                           │ ▲  (REST API / JSON / Sessions)
                                           ▼ │
+---------------------------------------------------------------------------------------+
|                                 EXPRESS.JS BACKEND                                    |
|  ┌─────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────┐  |
|  │  Router Middleware  │──▶│ Controllers (Auth & City) │──▶│ Mongoose / Schema ODM │  |
|  └─────────────────────┘   └───────────────────────────┘   └───────────────────────┘  |
|  EJS Template Engine (/status) | express-session Security | Static Asset Serving      |
+---------------------------------------------------------------------------------------+
                                           │ ▲
                                           ▼ │
+---------------------------------------------------------------------------------------+
|                                  DATABASE LAYER                                       |
|  Primary: MongoDB Atlas (Cloud Cluster M0)                                            |
|  Fallback: Local JSON Database Engine (data/users.json, data/buildings.json)          |
+---------------------------------------------------------------------------------------+
```

### Technology Breakdown:
* **Frontend:** HTML5, CSS3 (Modern Flexbox/Grid, Glassmorphic UI), JavaScript (ES6+ Modules), Three.js (r186), OrbitControls, TransformControls, GLTFLoader.
* **Runtime & Framework:** Node.js (v24+ / v26+), Express.js (v5.3.0).
* **Database & ODM:** MongoDB Atlas, Mongoose (v9.x).
* **Template Engine:** EJS (Embedded JavaScript Templates).
* **Security & Auth:** bcryptjs (salted password hashing), express-session, crypto.

---

## 3. Rubric Assessment Alignment

| Rubric Criteria | Weight | Implementation Details in UrbanForge | Status |
| :--- | :---: | :--- | :---: |
| **Frontend–Backend Data Flow** | **15%** | Asynchronous `fetch` calls for signup, login, active session query (`/api/auth/me`), instant building placement save (`POST /api/city/buildings`), building deletion (`DELETE`), and startup state loading. | **100% Complete** |
| **Node.js / Express Setup** | **10%** | Modular MVC backend in `backend/` folder; Express 5 route handlers, error handling middleware, parameterized routes, and environment configuration via `.env`. | **100% Complete** |
| **Template Engines & Static Files** | **5%** | Dual architecture: Express serves frontend static assets (`/pages`, `/css`, `/js`, `/assets`) while powering an **EJS dynamic template engine** view at `/status` for server diagnostics. | **100% Complete** |
| **MongoDB Operations via Mongoose** | **5%** | Mongoose connection with cluster health checks, strict Schema models with indexing and timestamps (`User.js`, `Building.js`, `CityLayout.js`), executing full CRUD operations. | **100% Complete** |
| **Innovation & Usability** | **5%** | Real-time Three.js 3D city building in the browser, raycasting-based placement, object transformation gizmos, and auto-syncing urban dynamics (budget/population/pollution). | **100% Complete** |

---

## 4. Page & Feature Status Matrix

| Page / Component | Route / File Path | Current Status | Implemented Features & Backend Integration |
| :--- | :--- | :---: | :--- |
| **Landing Page** | `index.html` | **Complete** | Hero showcase, interactive 3D feature grid, animated stat counters, and dynamic session-aware navigation bar. |
| **3D City Builder** | `pages/main.html`<br>`js/main.js` | **Complete** | **Three.js canvas**, 12 GLTF models, raycasting ground placement, coordinate transformation (W/E/R keys), live urban stats HUD, and **instant MongoDB sync for every placed/deleted building**. |
| **User Sign Up** | `pages/signup.html`<br>`js/signup.js` | **Complete** | Client validation, duplicate-email protection, bcrypt hashing, database persistence, and automated session initialization. |
| **User Sign In** | `pages/Login.html`<br>`js/login.js` | **Complete** | Secure login verification, password comparison via bcrypt, session cookie assignment, "Remember Me" handling, and auth redirects. |
| **Help & Contact** | `pages/help.html` | **Complete** | Validated inquiries form, character counters, embedded campus map graphic, and accessibility controls. |
| **Terms of Service** | `pages/terms.html` | **Complete** | 13 structured sections, scroll-progress tracker, and dynamic table of contents. |
| **System Diagnostics** | `/status`<br>`backend/views/status.ejs` | **Complete** | **Server-side rendered EJS view** providing live database connectivity state, cluster latency check, server port, and node uptime. |

---

## 5. 3D City Builder & Live MongoDB Persistence

The core innovation of UrbanForge is the seamless integration between client-side WebGL manipulation and backend database synchronization:

```
[User Clicks Ground] ──▶ Raycaster calculates (X, Y, Z)
                                │
                                ▼
                       Three.js adds mesh to scene
                                │
                                ▼
        POST /api/city/buildings { buildingId, modelPath, position, rotation }
                                │
                                ▼
                 MongoDB Mongoose saves Building document
```

### 1. Real-Time Save on Placement
When a user selects an asset from the drawer and clicks on the 100x100 grid:
* Three.js calculates the exact ground intersection coordinates.
* A unique identifier (`bld_<timestamp>_<hash>`) is bound to the mesh's `userData`.
* An asynchronous payload containing asset ID, model path, scaling factor, and 3D Vector coordinates is sent to `POST /api/city/buildings`.
* Mongoose inserts/upserts the record into the MongoDB `buildings` collection.

### 2. Live Deletion
* Selecting an existing building and pressing <kbd>Delete</kbd> removes the mesh from the WebGL scene and issues an HTTP `DELETE /api/city/buildings/:buildingId` call.
* The backend removes the matching document from MongoDB in real time.

### 3. Automatic World Reconstruction on Reload
* On page initialization, `loadSavedBuildings()` queries `GET /api/city/buildings`.
* The client iterates through saved records, instantiates the corresponding GLTF assets via `GLTFLoader`, restores their exact position/rotation/scale, and re-attaches raycasting colliders.

---

## 6. Backend Engineering & Database Architecture

The backend adheres strictly to the **Separation of Concerns (SoC)** principle:

```
backend/
├── config/
│   └── db.js                 # Mongoose connection manager & health check
├── controllers/
│   ├── authController.js     # User registration, authentication, & session lifecycle
│   └── cityController.js     # CRUD operations for 3D building placements & layouts
├── models/
│   ├── Building.js           # Mongoose Schema for individual 3D placed entities
│   ├── CityLayout.js         # Mongoose Schema for complete city snapshots
│   └── User.js               # Mongoose Schema for user credentials & timestamps
├── routes/
│   ├── authRoutes.js         # Endpoints: /signup, /login, /me, /logout
│   └── cityRoutes.js         # Endpoints: /buildings, /buildings/:id
├── services/
│   └── fileStorage.js        # High-reliability JSON fallback engine
├── views/
│   └── status.ejs            # EJS dynamic server-side template
└── server.js                 # Express server configuration, middleware, & static mounting
```

### Data Schema Design (Mongoose)

#### 1. User Schema (`backend/models/User.js`)
* `name`: String (Trimmed, required)
* `email`: String (Unique, lowercased, validated regex, indexed)
* `password`: String (Salted bcrypt hash, minimum length enforced)
* `timestamps`: Automatically records `createdAt` and `updatedAt`

#### 2. Building Schema (`backend/models/Building.js`)
* `userId`: String (Indexed for high-speed user queries)
* `buildingId`: String (Unique persistent identifier)
* `assetId` & `assetName`: String (e.g., "building1", "Skyscraper A")
* `modelPath`: String (Internal asset resolution path)
* `scale`: Number (Object scale multiplier)
* `position`: Object (`{ x: Number, y: Number, z: Number }`)
* `rotation`: Object (`{ x: Number, y: Number, z: Number }`)

---

## 7. Version Control & Repository Activity Log

The repository reflects iterative development with contributions across frontend design, 3D modeling, full-stack integration, and database management:

| Date | Contributor | Commit Summary & Key Deliverables |
| :--- | :--- | :--- |
| **18 Nov 2026** | **aaron-v13** | Engineered modular MVC backend (`backend/`), integrated MongoDB Mongoose schemas (`User.js`, `Building.js`, `CityLayout.js`), implemented EJS view engine (`status.ejs`), connected real-time building placement/deletion API, and configured `.gitignore` / `.env`. |
| **10 Nov 2026** | **aaron-v13** | Backend session handling, bcrypt authentication flow, and initial API routing integration. |
| **29 Oct 2026** | **hitenderyadav600-cmd** | Asset pipeline integration and visual review uploads. |
| **29 Oct 2026** | **priyanshirai25cse** | UI asset structuring and documentation asset integration. |
| **24–29 Oct 2026** | **disha125cse-eng** | Terms & Conditions documentation page implementation, design consistency audit, and Figma UI/UX layout sync. |
| **18 Oct 2026** | **aaron-v13** | Three.js integration, GLTF asset loading pipeline, raycasting controls, and Home/Login CSS restructuring. |
| **02 Oct 2026** | **ShauryaTyagi26** | Initial 3D engine scene prototyping and model asset bundling. |
| **18–30 Sep 2026** | **aaron-v13, disha125cse-eng** | Initial repository initialization, base HTML/CSS architecture, and Figma wireframe uploads. |

---

## 8. Conclusion & Project Readiness

UrbanForge successfully satisfies all criteria outlined in the course evaluation rubrics:
1. **Frontend-Backend Integration:** 100% operational with responsive UI and live API data flow.
2. **Server Architecture:** Express 5 MVC architecture with session security and modular routing.
3. **Template Engine:** Verified EJS integration providing dynamic server diagnostics.
4. **Database Depth:** Persistent cloud MongoDB storage via Mongoose ODM paired with robust offline JSON fallback.
5. **Technical Innovation:** Browser-based 3D city generation interacting with persistent database state.
