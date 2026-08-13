export interface DemoCredential {
  id: string;
  role: string;
  email: string;
  password: string;
  fullName: string;
  departmentId: string | null;
  city: string;
  state: string;
  roleLabel: string;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    id: "admin",
    role: "super_admin",
    email: "admin@samadhan.gov",
    password: "admin123",
    fullName: "Super Admin",
    departmentId: null,
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Super Admin",
  },
  {
    id: "water",
    role: "dept_admin",
    email: "dept.water@samadhan.gov",
    password: "dept123",
    fullName: "Jal Board Admin",
    departmentId: "water_supply",
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Water Supply",
  },
  {
    id: "sanitation",
    role: "dept_admin",
    email: "dept.sanitation@samadhan.gov",
    password: "dept123",
    fullName: "Sanitation Admin",
    departmentId: "sanitation",
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Sanitation",
  },
  {
    id: "electricity",
    role: "dept_admin",
    email: "dept.electricity@samadhan.gov",
    password: "dept123",
    fullName: "Electricity Admin",
    departmentId: "electricity",
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Electricity",
  },
  {
    id: "pwd",
    role: "dept_admin",
    email: "dept.pwd@samadhan.gov",
    password: "dept123",
    fullName: "PWD Admin",
    departmentId: "roads",
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Roads (PWD)",
  },
  {
    id: "parks",
    role: "dept_admin",
    email: "dept.parks@samadhan.gov",
    password: "dept123",
    fullName: "Parks Admin",
    departmentId: "parks",
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Parks & Gardens",
  },
  {
    id: "buildings",
    role: "dept_admin",
    email: "dept.buildings@samadhan.gov",
    password: "dept123",
    fullName: "Buildings Admin",
    departmentId: "buildings",
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Buildings",
  },
  {
    id: "citizen",
    role: "citizen",
    email: "citizen@samadhan.gov",
    password: "citizen123",
    fullName: "Citizen User",
    departmentId: null,
    city: "Bhopal",
    state: "Madhya Pradesh",
    roleLabel: "Citizen",
  },
];
