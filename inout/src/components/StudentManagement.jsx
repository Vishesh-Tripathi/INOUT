import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const StudentManagement = () => {
  const { addStudent, addStudents, students } = useData();
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    department: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.studentId || !formData.name) {
      toast.error('Student ID and Name are required');
      setIsSubmitting(false);
      return;
    }

    // Check if student ID already exists
    if (students.find(s => s.student_id === formData.studentId)) {
      toast.error('Student ID already exists');
      setIsSubmitting(false);
      return;
    }

    try {
      await addStudent(formData);
      setFormData({
        studentId: '',
        name: '',
        department: '',
        email: '',
        phone: ''
      });
    } catch (error) {
      toast.error('Failed to add student');
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
        phone: phone ? phone.toString() : ''
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Management</h2>

        {/* Manual Add Form */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Student Manually</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID *
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter student ID"
                required
              />
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
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter department"
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

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>

        {/* File Upload */}
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
            <p><strong>Required columns:</strong> studentId, name</p>
            <p><strong>Optional columns:</strong> department, email, phone</p>
            <p><strong>Note:</strong> Column names are case-insensitive and support variations (e.g., student_id, StudentId)</p>
          </div>
        </div>

        {/* Students Count */}
        <div className="mt-8 bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-indigo-800 font-medium">
              Total Students: {students.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;