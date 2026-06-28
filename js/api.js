/* TrainPass v2.3 — api.js */
const API = {
  async _post(body) {
    const res = await fetch(CONFIG.API_URL, {
      method:"POST", headers:{"Content-Type":"text/plain"},
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Server returned "+res.status);
    return res.json();
  },
  async call(action, data={}) {
    const token = sessionStorage.getItem(CONFIG.TOKEN_KEY);
    const json  = await this._post({ token, action, data });
    if (json.error === "Unauthorised") { this.logout(); }
    return json;
  },
  async login(u,p)           { return this._post({action:"login",data:{username:u,password:p}}); },
  async publicSearch(empNo)  { return this._post({action:"publicSearchEmployee",data:{employeeNo:empNo}}); },
  async publicGetTrainings(n){ return this._post({action:"publicGetTrainings",data:{employeeNo:n}}); },
  logout() {
    sessionStorage.removeItem(CONFIG.TOKEN_KEY);
    sessionStorage.removeItem(CONFIG.USER_KEY);
    const isPages = window.location.pathname.includes("/pages/");
    window.location.href = isPages ? "../index.html" : "index.html";
  },
  getEmployees:          d => API.call("getEmployees",d),
  addEmployee:           d => API.call("addEmployee",d),
  updateEmployee:        d => API.call("updateEmployee",d),
  lookupEmployee:        d => API.call("lookupEmployee",d),
  quickAddEmployee:      d => API.call("quickAddEmployee",d),
  checkDuplicate:        d => API.call("checkDuplicate",d),
  getTrainers:           d => API.call("getTrainers",d),
  updateTrainer:         d => API.call("updateTrainer",d),
  addUser:               d => API.call("addUser",d),
  getUsers:              d => API.call("getUsers",d),
  updateUser:            d => API.call("updateUser",d),
  getTopics:             d => API.call("getTopics",d),
  getTopicsWithSessions: d => API.call("getTopicsWithSessions",d),
  addTopic:              d => API.call("addTopic",d),
  deleteTopic:           d => API.call("deleteTopic",d),
  getSessions:           d => API.call("getSessions",d),
  getSessionDetail:      d => API.call("getSessionDetail",d),
  getSessionLogs:        d => API.call("getSessionLogs",d),
  createSession:         d => API.call("createSession",d),
  updateSession:         d => API.call("updateSession",d),
  deleteSession:         d => API.call("deleteSession",d),
  logAttendance:         d => API.call("logAttendance",d),
  getAllLogs:             d => API.call("getAllLogs",d),
  deleteLog:             d => API.call("deleteLog",d),
};
