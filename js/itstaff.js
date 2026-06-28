/* TrainPass v2.3 — itstaff.js */
(function () {
  const user = requireAuth("ITStaff");
  if (!user) return;
  setNavUser(user); initTabs(); initLogout();

  let allRecords=[], allEmployees=[], allTrainers=[], allUsers=[], allTopics=[];
  let deleteTarget=null, deleteTopicTarget=null;
  let currentPage=1, editingEmployee=null, editingUser=null;

  loadRecords(); loadEmployees(); loadTrainers(); loadUsers(); loadTopicsEnriched();

  // ══ RECORDS ══════════════════════════════════
  async function loadRecords() {
    try { const r=await API.getAllLogs({}); allRecords=r.data||[]; renderRecords(allRecords,1); }
    catch(e){ setErr("recordsBody",8,e.message); }
  }
  function renderRecords(records,page){
    currentPage=page;
    const tbody=document.getElementById("recordsBody");
    const paged=paginate(records,page);
    if(!records.length){ tbody.innerHTML=`<tr><td colspan="8" class="table-empty">No records.</td></tr>`; renderPagination("recordsPagination",0,1,CONFIG.PAGE_SIZE,()=>{}); return; }
    tbody.innerHTML=paged.map(l=>`<tr>
      <td><code style="font-size:11px">${esc(l.LogID)}</code></td>
      <td><strong>${esc(l.EmployeeNo)}</strong></td>
      <td>${esc(l.EmployeeName||"")}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">${esc(l.SessionTitle||l.SessionID||"—")}</td>
      <td>${fmtDate(l.AttendanceDate)}</td>
      <td>${esc(l.CheckInMethod||"")}</td>
      <td>${resultBadge(l.Passed)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="openDeleteLog('${esc(l.LogID)}')">Delete</button></td>
    </tr>`).join("");
    renderPagination("recordsPagination",records.length,page,CONFIG.PAGE_SIZE,p=>renderRecords(records,p));
  }
  document.getElementById("applyRecordFilters").addEventListener("click",()=>{
    const q=document.getElementById("recordSearch").value.toLowerCase();
    const r=document.getElementById("recordResult").value;
    const f=document.getElementById("recordDateFrom").value;
    const t=document.getElementById("recordDateTo").value;
    renderRecords(allRecords.filter(l=>{
      const txt=(l.EmployeeName+l.EmployeeNo+l.LogID+(l.SessionTitle||"")).toLowerCase();
      const d=l.AttendanceDate||"";
      return(!q||txt.includes(q))&&(!r||l.Passed===r)&&(!f||d>=f)&&(!t||d<=t);
    }),1);
  });
  window.openDeleteLog=function(logID){
    deleteTarget=logID;
    document.getElementById("deleteLogIDDisplay").textContent=logID;
    document.getElementById("deleteReason").value="";
    hideAlert(document.getElementById("deleteFormAlert"));
    openModal("deleteModal");
  };
  document.getElementById("closeDeleteModal").addEventListener("click",()=>closeModal("deleteModal"));
  document.getElementById("cancelDelete").addEventListener("click",()=>closeModal("deleteModal"));
  document.getElementById("confirmDeleteBtn").addEventListener("click",async()=>{
    const reason=document.getElementById("deleteReason").value.trim();
    const a=document.getElementById("deleteFormAlert"); hideAlert(a);
    if(!reason){showAlert(a,"Reason is required.");return;}
    try{
      const res=await API.deleteLog({LogID:deleteTarget,DeleteReason:reason});
      if(res.success){showToast("Log deleted.","success");closeModal("deleteModal");allRecords=allRecords.filter(r=>r.LogID!==deleteTarget);deleteTarget=null;renderRecords(allRecords,currentPage);}
      else showAlert(a,res.error||"Delete failed.");
    }catch(e){showAlert(a,e.message);}
  });

  // ══ EMPLOYEES ════════════════════════════════
  async function loadEmployees(){
    try{const r=await API.getEmployees({});allEmployees=r.data||[];renderEmployees(allEmployees);}
    catch(e){setErr("employeeBody",6,e.message);}
  }
  function renderEmployees(list){
    const tbody=document.getElementById("employeeBody");
    if(!list.length){tbody.innerHTML=`<tr><td colspan="6" class="table-empty">No employees.</td></tr>`;return;}
    tbody.innerHTML=list.map(e=>`<tr>
      <td><strong>${esc(e.EmployeeNo)}</strong></td>
      <td>${esc(e.FirstName)} ${esc(e.LastName)}</td>
      <td>${esc(e.Department||"—")}</td>
      <td>${esc(e.JobTitle||"—")}</td>
      <td>${esc(e.Email||"—")}</td>
      <td>
        <span class="badge ${e.Status==="Active"?"badge-passed":"badge-failed"}">${esc(e.Status)}</span>
        <button class="btn btn-ghost btn-sm" style="margin-left:6px" onclick='openEditEmployee(${JSON.stringify(e)})'>Edit</button>
      </td>
    </tr>`).join("");
  }
  document.getElementById("applyEmployeeFilter").addEventListener("click",()=>{
    const q=document.getElementById("employeeSearch").value.toLowerCase();
    renderEmployees(allEmployees.filter(e=>(e.EmployeeNo+e.FirstName+e.LastName+e.Department).toLowerCase().includes(q)));
  });
  document.getElementById("openAddEmployee").addEventListener("click",()=>{editingEmployee=null;resetEmpForm();document.getElementById("empModalTitle").textContent="Add Employee";document.getElementById("eNo").disabled=false;openModal("addEmployeeModal");});
  document.getElementById("closeAddEmployee").addEventListener("click",()=>closeModal("addEmployeeModal"));
  document.getElementById("cancelAddEmployee").addEventListener("click",()=>closeModal("addEmployeeModal"));
  window.openEditEmployee=function(emp){
    editingEmployee=emp;
    document.getElementById("empModalTitle").textContent="Edit Employee";
    document.getElementById("eNo").value=emp.EmployeeNo; document.getElementById("eNo").disabled=true;
    document.getElementById("eFirst").value=emp.FirstName||""; document.getElementById("eLast").value=emp.LastName||"";
    document.getElementById("eEmail").value=emp.Email||""; document.getElementById("eDept").value=emp.Department||"";
    document.getElementById("eJob").value=emp.JobTitle||""; document.getElementById("eNotes").value=emp.Notes||"";
    hideAlert(document.getElementById("empFormAlert")); openModal("addEmployeeModal");
  };
  function resetEmpForm(){document.getElementById("addEmployeeForm").reset();document.getElementById("eNo").disabled=false;hideAlert(document.getElementById("empFormAlert"));}
  document.getElementById("addEmployeeForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const a=document.getElementById("empFormAlert"); hideAlert(a);
    const p={EmployeeNo:document.getElementById("eNo").value.trim(),FirstName:document.getElementById("eFirst").value.trim(),LastName:document.getElementById("eLast").value.trim(),Email:document.getElementById("eEmail").value.trim(),Department:document.getElementById("eDept").value.trim(),JobTitle:document.getElementById("eJob").value.trim(),Notes:document.getElementById("eNotes").value.trim()};
    if(!p.FirstName||!p.LastName){showAlert(a,"First and last name required.");return;}
    try{
      let res;
      if(editingEmployee){res=await API.updateEmployee(p);if(res.success){showToast("Employee updated.","success");closeModal("addEmployeeModal");loadEmployees();}else showAlert(a,res.error||"Failed.");}
      else{if(!p.EmployeeNo){showAlert(a,"Employee number required.");return;}res=await API.addEmployee(p);if(res.success){showToast("Employee added.","success");closeModal("addEmployeeModal");resetEmpForm();loadEmployees();}else showAlert(a,res.error||"Failed.");}
    }catch(e){showAlert(a,e.message);}
  });

  // ══ TRAINERS (read-only) ══════════════════════
  async function loadTrainers(){
    try{const r=await API.getTrainers({});allTrainers=r.data||[];renderTrainers(allTrainers);}
    catch(e){setErr("trainerBody",5,e.message);}
  }
  function renderTrainers(list){
    const tbody=document.getElementById("trainerBody");
    if(!list.length){tbody.innerHTML=`<tr><td colspan="5" class="table-empty">No trainers. Add via User Logins tab with Role = Trainer.</td></tr>`;return;}
    tbody.innerHTML=list.map(t=>`<tr>
      <td><strong>${esc(t.EmployeeNo||"—")}</strong></td>
      <td>${esc(t.FirstName)} ${esc(t.LastName)}</td>
      <td>${esc(t.Department||"—")}</td>
      <td>${esc(t.Specialisation||"—")}</td>
      <td><span class="badge ${t.Status==="Active"?"badge-passed":"badge-failed"}">${esc(t.Status)}</span></td>
    </tr>`).join("");
  }

  // ══ USERS (MERGED) ════════════════════════════
  async function loadUsers(){
    try{const r=await API.getUsers({});allUsers=r.data||[];renderUsers(allUsers);}
    catch(e){setErr("userBody",6,e.message);}
  }
  function renderUsers(list){
    const tbody=document.getElementById("userBody");
    if(!list.length){tbody.innerHTML=`<tr><td colspan="6" class="table-empty">No users.</td></tr>`;return;}
    tbody.innerHTML=list.map(u=>`<tr>
      <td><strong>${esc(u.Username)}</strong></td>
      <td><span class="role-badge ${u.Role==="ITStaff"?"role-it":"role-trainer"}">${esc(u.Role)}</span></td>
      <td>${esc(u.EmployeeNo||"—")}</td>
      <td>${esc(u.Email||"—")}</td>
      <td><span class="badge ${(u.IsActive===true||String(u.IsActive).toUpperCase()==="TRUE")?"badge-passed":"badge-failed"}">${(u.IsActive===true||String(u.IsActive).toUpperCase()==="TRUE")?"Active":"Inactive"}</span></td>
      <td>
        <span style="font-size:12px">${fmtDate(u.LastLogin)}</span>
        <button class="btn btn-ghost btn-sm" style="margin-left:6px" onclick='openEditUser(${JSON.stringify(u)})'>Edit</button>
      </td>
    </tr>`).join("");
  }

  function toggleTrainerFields(){
    const role=document.getElementById("uRole").value;
    document.getElementById("trainerFieldsSection").classList.toggle("hidden",role!=="Trainer");
  }
  document.getElementById("uRole").addEventListener("change",toggleTrainerFields);

  document.getElementById("openAddUser").addEventListener("click",()=>{
    editingUser=null; resetUserForm();
    document.getElementById("userModalTitle").textContent="Add User";
    document.getElementById("uPasswordHint").classList.add("hidden");
    document.getElementById("uPassword").placeholder="Password";
    document.getElementById("uFirstName").closest(".field-row").style.display="";
    document.getElementById("uEmpNo").closest(".field-row").style.display="";
    toggleTrainerFields();
    openModal("addUserModal");
  });
  document.getElementById("closeAddUser").addEventListener("click",()=>closeModal("addUserModal"));
  document.getElementById("cancelAddUser").addEventListener("click",()=>closeModal("addUserModal"));
  window.openEditUser=function(u){
    editingUser=u;
    document.getElementById("userModalTitle").textContent="Edit User Login";
    document.getElementById("uUsername").value=u.Username||"";
    document.getElementById("uPassword").value=""; document.getElementById("uPassword").placeholder="Leave blank to keep current";
    document.getElementById("uPasswordHint").classList.remove("hidden");
    document.getElementById("uRole").value=u.Role||"Trainer";
    document.getElementById("uEmpNo").value=u.EmployeeNo||"";
    document.getElementById("uEmail").value=u.Email||"";
    document.getElementById("uActive").value=(u.IsActive===true||String(u.IsActive).toUpperCase()==="TRUE")?"true":"false";
    document.getElementById("uFirstName").value=""; document.getElementById("uLastName").value="";
    document.getElementById("uDept").value=""; document.getElementById("uSpec").value="";
    document.getElementById("uJobTitle").value="";
    document.getElementById("trainerFieldsSection").classList.add("hidden");
    hideAlert(document.getElementById("userFormAlert")); openModal("addUserModal");
  };
  function resetUserForm(){document.getElementById("addUserForm").reset();document.getElementById("uActive").value="true";hideAlert(document.getElementById("userFormAlert"));}
  document.getElementById("addUserForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const a=document.getElementById("userFormAlert"); hideAlert(a);
    const username=document.getElementById("uUsername").value.trim();
    const password=document.getElementById("uPassword").value.trim();
    const role    =document.getElementById("uRole").value;
    const empNo   =document.getElementById("uEmpNo").value.trim();
    const email   =document.getElementById("uEmail").value.trim();
    const isActive=document.getElementById("uActive").value==="true";
    const firstName=document.getElementById("uFirstName").value.trim();
    const lastName =document.getElementById("uLastName").value.trim();
    const dept     =document.getElementById("uDept").value.trim();
    const spec     =document.getElementById("uSpec").value.trim();
    const jobTitle =document.getElementById("uJobTitle").value.trim();
    if(!username||!role){showAlert(a,"Username and role are required.");return;}
    try{
      let res;
      if(editingUser){
        const fields={Username:username,Role:role,LinkedID:empNo,Email:email,IsActive:isActive};
        if(password) fields.Password=password;
        res=await API.updateUser({UserID:editingUser.UserID,...fields});
        if(res.success){showToast("User updated.","success");closeModal("addUserModal");loadUsers();}
        else showAlert(a,res.error||"Update failed.");
      } else {
        if(!password){showAlert(a,"Password is required for new users.");return;}
        if(!firstName||!lastName){showAlert(a,"First and last name are required.");return;}
        if(!empNo){showAlert(a,"Employee number is required.");return;}
        res=await API.addUser({Username:username,Password:password,Role:role,EmployeeNo:empNo,Email:email,FirstName:firstName,LastName:lastName,Department:dept,Specialisation:spec,JobTitle:jobTitle});
        if(res.success){showToast(res.message||"User created.","success");closeModal("addUserModal");resetUserForm();loadUsers();loadTrainers();loadEmployees();}
        else showAlert(a,res.error||"Failed.");
      }
    }catch(e){showAlert(a,e.message);}
  });

  // ══ TOPICS ═══════════════════════════════════
  async function loadTopicsEnriched(){
    try{const r=await API.getTopicsWithSessions({});allTopics=r.data||[];renderTopics(allTopics);}
    catch(e){setErr("topicsBody",5,e.message);}
  }
  function renderTopics(list){
    const tbody=document.getElementById("topicsBody");
    if(!list.length){tbody.innerHTML=`<tr><td colspan="5" class="table-empty">No topics.</td></tr>`;return;}
    tbody.innerHTML=list.map(t=>`<tr>
      <td><code style="font-size:11px">${esc(t.TopicID)}</code></td>
      <td><strong>${esc(t.Title)}</strong> ${typeBadge(t.Category)}</td>
      <td>${esc(t.Department||"—")}</td>
      <td>${esc(t.TrainerName||"—")}</td>
      <td>
        <span style="font-size:12px;color:var(--text-muted)">${esc(t.Description||"—")}</span>
        <span class="badge badge-passed" style="margin-left:6px">${t.Completed||0} done</span>
        <span class="badge badge-pending" style="margin-left:4px">${t.Scheduled||0} pending</span>
        <button class="btn btn-danger btn-sm" style="margin-left:8px" onclick="confirmDeleteTopic('${esc(t.TopicID)}','${esc(t.Title)}')">Delete</button>
      </td>
    </tr>`).join("");
  }
  window.confirmDeleteTopic=function(topicID,title){
    deleteTopicTarget=topicID;
    document.getElementById("deleteTopicName").textContent=title;
    openModal("deleteTopicModal");
  };
  document.getElementById("closeDeleteTopicModal").addEventListener("click",()=>closeModal("deleteTopicModal"));
  document.getElementById("cancelDeleteTopic").addEventListener("click",()=>closeModal("deleteTopicModal"));
  document.getElementById("confirmDeleteTopicBtn").addEventListener("click",async()=>{
    if(!deleteTopicTarget) return;
    try{
      const res=await API.deleteTopic({TopicID:deleteTopicTarget});
      if(res.success){showToast("Topic deleted.","success");closeModal("deleteTopicModal");deleteTopicTarget=null;loadTopicsEnriched();}
      else showToast(res.error||"Delete failed.","error");
    }catch(e){showToast(e.message,"error");}
  });

  function setErr(id,cols,msg){document.getElementById(id).innerHTML=`<tr><td colspan="${cols}" class="table-empty" style="color:var(--danger)">${msg}</td></tr>`;}
})();
