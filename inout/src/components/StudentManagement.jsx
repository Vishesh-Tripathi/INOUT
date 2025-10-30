import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const StudentManagement = () => {
  const { addStudent, addStudents, updateStudent, deleteStudent, students, loadStudents } = useData();
  const { user, isAuthenticated } = useAuth();
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Basic file validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP)');
      e.target.value = '';
      return;
    }

    if (file.size > maxSize) {
      toast.error('Image size must be less than 5MB');
      e.target.value = '';
      return;
    }
    
    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
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
    setSelectedImage(null);
    setImagePreview(null);
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
    setImagePreview(student.imageUrl || null);
    setSelectedImage(null);
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

  const handleDeleteStudentImage = async (studentId, studentName, imageUrl) => {
    if (window.confirm(`Are you sure you want to delete the profile image for ${studentName}?`)) {
      try {
        // Update student record to remove image URL - let backend handle S3 deletion
        const student = students.find(s => s.student_id === studentId);
        if (student) {
          await updateStudent(studentId, {
            ...student,
            imageUrl: null
          });
          toast.success('Student image deleted successfully');
        }
      } catch (error) {
        console.error('Failed to delete student image:', error);
        toast.error('Failed to delete student image');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!isAuthenticated || !user) {
      toast.error('You must be logged in to perform this action');
      setIsSubmitting(false);
      return;
    }

    if (!formData.studentId || !formData.name || !formData.department) {
      toast.error('Student ID, Name, and Department are required');
      setIsSubmitting(false);
      return;
    }

    try {
      // Create FormData to send both form data and file
      const formDataToSend = new FormData();
      
      // Add form fields
      formDataToSend.append('student_id', formData.studentId);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('department', formData.department);
      if (formData.email) formDataToSend.append('email', formData.email);
      if (formData.phone) formDataToSend.append('phone', formData.phone);
      if (formData.address) formDataToSend.append('address', formData.address);
      if (formData.city) formDataToSend.append('city', formData.city);
      if (formData.state) formDataToSend.append('state', formData.state);
      if (formData.pin) formDataToSend.append('pin', formData.pin);
      if (formData.country) formDataToSend.append('country', formData.country);
      if (formData.semester) formDataToSend.append('semester', formData.semester);
      
      // Add imageUrl if no file is selected but there's an existing URL
      if (!selectedImage && formData.imageUrl) {
        formDataToSend.append('imageUrl', formData.imageUrl);
      }
      
      // Add image file if selected - let backend handle the upload
      if (selectedImage) {
        setIsUploadingImage(true);
        formDataToSend.append('image', selectedImage);
      }

      if (editingStudent) {
        // Update existing student
        const response = await api.put(`/students/${editingStudent}`, formDataToSend);
        
        if (response.success) {
          toast.success('Student updated successfully');
          
          // Refresh the students data to show the updated information
          await loadStudents();
          resetForm();
        } else {
          throw new Error(response.message || 'Failed to update student');
        }
      } else {
        // Check if student ID already exists
        if (students.find(s => s.student_id === formData.studentId)) {
          toast.error('Student ID already exists');
          setIsSubmitting(false);
          setIsUploadingImage(false);
          return;
        }

        // Create new student
        const response = await api.post('/students', formDataToSend);
        
        if (response.success) {
          toast.success('Student created successfully');
          
          // Refresh the students data to show the new student
          await loadStudents();
          resetForm();
        } else {
          throw new Error(response.message || 'Failed to create student');
        }
      }

      setIsUploadingImage(false);
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Failed to save student: ' + error.message);
      setIsUploadingImage(false);
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
              handleImageChange={handleImageChange}
              handleSubmit={handleSubmit}
              handleFileUpload={handleFileUpload}
              isSubmitting={isSubmitting}
              isUploadingImage={isUploadingImage}
              editingStudent={editingStudent}
              resetForm={resetForm}
              addStudents={addStudents}
              students={students}
              selectedImage={selectedImage}
              imagePreview={imagePreview}
              removeImage={removeImage}
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
              handleDeleteStudentImage={handleDeleteStudentImage}
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
  handleImageChange,
  handleSubmit, 
  handleFileUpload, 
  isSubmitting,
  isUploadingImage,
  editingStudent, 
  resetForm,
  addStudents,
  students,
  selectedImage,
  imagePreview,
  removeImage
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

          {/* Image Upload Section */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Image
            </label>
            <div className="mt-1 flex items-center space-x-4">
              {/* Image Preview */}
              <div className="flex-shrink-0">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      className="h-20 w-20 rounded-lg object-cover border-2 border-gray-300"
                      src={imagePreview}
                      alt="Preview"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <label htmlFor="image-upload" className="cursor-pointer bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-600 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </label>
                  <input
                    id="image-upload"
                    name="image"
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPEG, PNG, WebP. Max size: 5MB
                </p>
                {selectedImage && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {selectedImage.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Legacy Image URL Input (optional) */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Image URL (legacy)
            </label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter image URL (will be overridden by uploaded file)"
              disabled={!!selectedImage}
            />
            {selectedImage && (
              <p className="text-xs text-gray-500 mt-1">
                This field is disabled when an image file is selected for upload
              </p>
            )}
          </div>

          <div className="lg:col-span-3 mt-6">
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || isUploadingImage}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center"
              >
                {isUploadingImage ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading Image...
                  </>
                ) : isSubmitting ? (
                  editingStudent ? 'Updating...' : 'Adding...'
                ) : (
                  editingStudent ? 'Update Student' : 'Add Student'
                )}
              </button>
              {editingStudent && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting || isUploadingImage}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
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
            <p><strong>Optional columns:</strong> email, phone, address, city, state, pin, country, semester</p>
            <p><strong>Note:</strong> Column names are case-insensitive and support variations (e.g., student_id, StudentId)</p>
            <p><strong>Semester:</strong> Must be a number between 1-12</p>
          </div>
        </div>

      )}
        <BulkImageUpload students={students} />
      </div>
  

  );
};

// Bulk Image Upload Component
const BulkImageUpload = ({ students }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);
    const results = [];
    const errors = [];

    // Create FormData for bulk upload
    const formData = new FormData();
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const studentId = file.name.split('_')[0]; // Assuming filename format: studentId_name.ext

      try {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 'uploading'
        }));

        // Check if student exists
        const student = students.find(s => s.student_id === studentId);
        if (!student) {
          errors.push({
            file: file.name,
            error: `Student with ID ${studentId} not found`
          });
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 'error'
          }));
          continue;
        }

        // Add file to FormData with student ID as key
        formData.append(`${studentId}`, file);
        
        results.push({
          file: file.name,
          studentId: studentId,
          studentName: student.name
        });

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 'ready'
        }));
      } catch (error) {
        errors.push({
          file: file.name,
          error: error.message
        });
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 'error'
        }));
      }
    }

    // Send all files to backend at once
    if (results.length > 0) {
      try {
        const response = await api.post('/students/bulk-upload-images', formData);
        
        if (response.success) {
          toast.success(`Successfully uploaded ${results.length} images`);
          
          // Update progress for successful uploads
          results.forEach(result => {
            setUploadProgress(prev => ({
              ...prev,
              [result.file]: 'success'
            }));
          });
        } else {
          throw new Error(response.message || 'Bulk upload failed');
        }
      } catch (error) {
        toast.error('Bulk upload failed: ' + error.message);
        console.error('Bulk upload error:', error);
        
        // Mark all as error
        results.forEach(result => {
          setUploadProgress(prev => ({
            ...prev,
            [result.file]: 'error'
          }));
        });
      }
    }

    setIsUploading(false);

    if (errors.length > 0) {
      toast.error(`${errors.length} files had errors. Check console for details.`);
      console.error('Upload errors:', errors);
    }

    // Reset after a delay
    setTimeout(() => {
      setSelectedFiles([]);
      setUploadProgress({});
    }, 3000);
  };

  return (
    <div className="border-t pt-8">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Bulk Upload Student Images</h3>
      <div className="bg-blue-50 rounded-lg p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">
            <strong>File naming convention:</strong> studentId_name.jpg (e.g., CS001_john_doe.jpg)
          </p>
          <p className="text-sm text-gray-600">
            The system will extract the student ID from the filename before the first underscore.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="bulk-image-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Select Student Images
            </label>
            <input
              id="bulk-image-upload"
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="max-h-40 overflow-y-auto bg-white rounded border p-3">
                {selectedFiles.map((file, index) => {
                  const studentId = file.name.split('_')[0];
                  const student = students.find(s => s.student_id === studentId);
                  const status = uploadProgress[file.name];

                  return (
                    <div key={index} className="flex items-center justify-between py-1 text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-700">{file.name}</span>
                        {!student && (
                          <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                            Student not found
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        {status === 'uploading' && (
                          <div className="flex items-center text-blue-600">
                            <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Uploading...
                          </div>
                        )}
                        {status === 'ready' && (
                          <div className="text-orange-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </div>
                        )}
                        {status === 'success' && (
                          <div className="text-green-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                        {status === 'error' && (
                          <div className="text-red-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleBulkUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Images`}
            </button>
            <button
              onClick={() => {
                setSelectedFiles([]);
                setUploadProgress({});
                document.getElementById('bulk-image-upload').value = '';
              }}
              disabled={isUploading}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
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
  handleDeleteStudentImage,
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
                  <tr key={student.student_id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {student.imageUrl ? (
                          <div className="relative mr-3">
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={student.imageUrl}
                              alt={student.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <button
                              onClick={() => handleDeleteStudentImage(student.student_id, student.name, student.imageUrl)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
                              title="Delete Profile Image"
                            >
                              ×
                            </button>
                          </div>
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded transition-colors"
                        >
                          Edit
                        </button>
                        {student.imageUrl && (
                          <button
                            onClick={() => handleDeleteStudentImage(student.student_id, student.name, student.imageUrl)}
                            className="text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded transition-colors"
                            title="Delete Profile Image"
                          >
                            Remove Photo
                          </button>
                        )}
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