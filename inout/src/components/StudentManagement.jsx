import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const StudentManagement = () => {
  const { addStudent, addStudents, updateStudent, deleteStudent, students } = useData();
  const [activeTab, setActiveTab] = useState('add'); // 'add' or 'manage'
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    department: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    country: 'India',
    semester: '',
    imageUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      name: '',
      department: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pin: '',
      country: 'India',
      semester: '',
      imageUrl: ''
    });
    setEditingStudent(null);
  };

  const handleEdit = (student) => {
    setFormData({
      studentId: student.student_id,
      name: student.name,
      department: student.department || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pin: student.pin || '',
      country: student.country || 'India',
      semester: student.semester || '',
      imageUrl: student.imageUrl || ''
    });
    setEditingStudent(student.student_id);
    setActiveTab('add'); // Switch to add tab for editing
  };

  const handleDelete = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      try {
        await deleteStudent(studentId);
      } catch (error) {
        // Error handling is done in DataContext
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.studentId || !formData.name || !formData.department) {
      toast.error('Student ID, Name, and Department are required');
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingStudent) {
        // Update existing student
        await updateStudent(editingStudent, {
          name: formData.name,
          department: formData.department,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pin: formData.pin,
          country: formData.country,
          semester: formData.semester ? parseInt(formData.semester) : null,
          imageUrl: formData.imageUrl
        });
        resetForm();
      } else {
        // Check if student ID already exists
        if (students.find(s => s.student_id === formData.studentId)) {
          toast.error('Student ID already exists');
          setIsSubmitting(false);
          return;
        }

        // Add new student
        await addStudent(formData);
        resetForm();
      }
    } catch (error) {
      // Error handling is done in DataContext
    }

    setIsSubmitting(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          processFileData(results.data);
        },
        header: true,
        error: (error) => {
          toast.error('Error parsing CSV file');
          console.error(error);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          processFileData(data);
        } catch (error) {
          toast.error('Error parsing Excel file');
          console.error(error);
        }
      };
      reader.readAsBinaryString(file);
    } else if (fileExtension === 'json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          processFileData(Array.isArray(data) ? data : [data]);
        } catch (error) {
          toast.error('Error parsing JSON file');
          console.error(error);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error('Unsupported file format. Please use CSV, Excel, or JSON.');
    }

    // Clear the file input
    e.target.value = '';
  };

  const processFileData = async (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      toast.error('No valid data found in file');
      return;
    }

    const validStudents = [];
    const errors = [];

    data.forEach((row, index) => {
      // Handle different possible column names
      const studentId = row.studentId || row.StudentId || row.student_id || row.id || row.ID;
      const name = row.name || row.Name || row.studentName || row.student_name;
      const department = row.department || row.Department || row.dept || row.Dept;
      const email = row.email || row.Email || row.emailAddress;
      const phone = row.phone || row.Phone || row.phoneNumber || row.mobile;
      const address = row.address || row.Address || row.streetAddress;
      const city = row.city || row.City;
      const state = row.state || row.State || row.province;
      const pin = row.pin || row.Pin || row.pincode || row.postalCode || row.zipCode;
      const country = row.country || row.Country || 'India';
      const semester = row.semester || row.Semester || row.sem;
      const imageUrl = row.imageUrl || row.ImageUrl || row.image_url || row.photo;

      if (!studentId || !name) {
        errors.push(`Row ${index + 1}: Missing required fields (studentId, name)`);
        return;
      }

      // Check if student ID already exists
      if (students.find(s => s.student_id === studentId)) {
        errors.push(`Row ${index + 1}: Student ID ${studentId} already exists`);
        return;
      }

      validStudents.push({
        studentId: studentId.toString(),
        name: name.toString(),
        department: department ? department.toString() : '',
        email: email ? email.toString() : '',
        phone: phone ? phone.toString() : '',
        address: address ? address.toString() : '',
        city: city ? city.toString() : '',
        state: state ? state.toString() : '',
        pin: pin ? pin.toString() : '',
        country: country ? country.toString() : 'India',
        semester: semester ? parseInt(semester) || null : null,
        imageUrl: imageUrl ? imageUrl.toString() : ''
      });
    });

    if (errors.length > 0) {
      console.warn('Import errors:', errors);
      toast.error(`${errors.length} rows had errors. Check console for details.`);
    }

    if (validStudents.length > 0) {
      try {
        await addStudents(validStudents);
      } catch (error) {
        // Error toast is handled in DataContext
      }
    } else {
      toast.error('No valid students found to import');
    }
  };

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = !filterDepartment || 
      (student.department && student.department.toLowerCase().includes(filterDepartment.toLowerCase()));
    
    const matchesSemester = !filterSemester || 
      (student.semester && student.semester.toString() === filterSemester);

    return matchesSearch && matchesDepartment && matchesSemester;
  });

  // Get unique departments and semesters for filter options
  const departments = [...new Set(students.map(s => s.department).filter(Boolean))].sort();
  const semesters = [...new Set(students.map(s => s.semester).filter(Boolean))].sort((a, b) => a - b);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6">
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600 mt-1">Add, edit, and manage student records</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('add')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'add'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {editingStudent ? 'Edit Student' : 'Add Student'}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'manage'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Manage Students ({students.length})
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          {activeTab === 'add' && (
            <AddStudentTab 
              formData={formData}
              setFormData={setFormData}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              handleFileUpload={handleFileUpload}
              isSubmitting={isSubmitting}
              editingStudent={editingStudent}
              resetForm={resetForm}
              addStudents={addStudents}
              students={students}
            />
          )}

          {activeTab === 'manage' && (
            <ManageStudentsTab
              students={students}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterDepartment={filterDepartment}
              setFilterDepartment={setFilterDepartment}
              filterSemester={filterSemester}
              setFilterSemester={setFilterSemester}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              filteredStudents={filteredStudents}
              departments={departments}
              semesters={semesters}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Add Student Tab Component
const AddStudentTab = ({ 
  formData, 
  handleInputChange, 
  handleSubmit, 
  handleFileUpload, 
  isSubmitting, 
  editingStudent, 
  resetForm,
  addStudents,
  students
}) => {
  return (
    <div className="space-y-8">
      {/* Manual Add/Edit Form */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-700">
            {editingStudent ? 'Edit Student Details' : 'Add New Student'}
          </h3>
          {editingStudent && (
            <button
              onClick={resetForm}
              className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Basic Information */}
          <div className="lg:col-span-3">
            <h4 className="text-md font-medium text-gray-600 mb-3 border-b pb-2">Basic Information</h4>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID *
            </label>
            <input
              type="text"
              name="studentId"
              value={formData.studentId}
              onChange={handleInputChange}
              disabled={editingStudent}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${editingStudent ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Enter student ID"
              required
            />
            {editingStudent && (
              <p className="text-xs text-gray-500 mt-1">Student ID cannot be changed</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter student name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department *
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter department"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semester
            </label>
            <input
              type="number"
              name="semester"
              value={formData.semester}
              onChange={handleInputChange}
              min="1"
              max="12"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter semester (1-12)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter phone number"
            />
          </div>

          {/* Address Information */}
          <div className="lg:col-span-3 mt-4">
            <h4 className="text-md font-medium text-gray-600 mb-3 border-b pb-2">Address Information</h4>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter street address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter state"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN Code
            </label>
            <input
              type="text"
              name="pin"
              value={formData.pin}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter PIN code"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter country"
            />
          </div>

          {/* Additional Information */}
          <div className="lg:col-span-3 mt-4">
            <h4 className="text-md font-medium text-gray-600 mb-3 border-b pb-2">Additional Information</h4>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter image URL (jpg, jpeg, png, gif, webp)"
            />
          </div>

          <div className="lg:col-span-3 mt-6">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                {isSubmitting 
                  ? (editingStudent ? 'Updating...' : 'Adding...') 
                  : (editingStudent ? 'Update Student' : 'Add Student')
                }
              </button>
              {editingStudent && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* File Upload Section */}
      {!editingStudent && (
        <div className="border-t pt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Import Students from File</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Upload CSV, Excel, or JSON file
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={handleFileUpload}
                  />
                  <span className="mt-2 block text-sm text-gray-500">
                    Supported formats: CSV, XLSX, XLS, JSON
                  </span>
                </label>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => document.getElementById('file-upload').click()}
                  className="bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-600 font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  Choose File
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Required columns:</strong> studentId, name, department</p>
            <p><strong>Optional columns:</strong> email, phone, address, city, state, pin, country, semester, imageUrl</p>
            <p><strong>Note:</strong> Column names are case-insensitive and support variations (e.g., student_id, StudentId)</p>
            <p><strong>Semester:</strong> Must be a number between 1-12</p>
            <p><strong>ImageUrl:</strong> Must be a valid URL with supported formats (jpg, jpeg, png, gif, webp)</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Manage Students Tab Component
const ManageStudentsTab = ({ 
  students,
  searchTerm,
  setSearchTerm,
  filterDepartment,
  setFilterDepartment,
  filterSemester,
  setFilterSemester,
  handleEdit,
  handleDelete,
  filteredStudents,
  departments,
  semesters
}) => {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Students
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Search by name, ID, or email..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Department
          </label>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Semester
          </label>
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Semesters</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-gray-700 font-medium">
              Showing {filteredStudents.length} of {students.length} students
            </span>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Academic
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-lg font-medium">
                        {students.length === 0 ? 'No students added yet' : 'No students match your search criteria'}
                      </p>
                      <p className="text-sm mt-1">
                        {students.length === 0 ? 'Add your first student using the "Add Student" tab' : 'Try adjusting your search or filter criteria'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {student.imageUrl ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover mr-3"
                            src={student.imageUrl}
                            alt={student.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center mr-3 ${student.imageUrl ? 'hidden' : ''}`}>
                          <span className="text-sm font-medium text-white">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.email || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{student.phone || 'N/A'}</div>
                      {student.city && student.state && (
                        <div className="text-xs text-gray-400">{student.city}, {student.state}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.department}</div>
                      {student.semester && (
                        <div className="text-sm text-gray-500">Semester {student.semester}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.status === 'in' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status === 'in' ? 'Inside' : 'Outside'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.student_id, student.name)}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;