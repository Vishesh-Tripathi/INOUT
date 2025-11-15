import React, { useState } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api.js';
import logo from '../assets/logo.png';

const StudentRegistration = () => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
    setIsSubmitted(false);
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
      
      // Add image file if selected
      if (selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      const response = await apiService.registerStudent(formDataToSend);
      
      if (response.success) {
        toast.success('Registration submitted successfully! Your application is pending admin verification.');
        setIsSubmitted(true);
      } else {
        throw new Error(response.message || 'Failed to register student');
      }
    } catch (error) {
      console.error('Error registering student:', error);
      if (error.message.includes('already exists')) {
        toast.error('Student ID already exists. Please use a different Student ID.');
      } else {
        toast.error('Failed to register: ' + error.message);
      }
    }

    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your registration has been submitted successfully. You will receive a confirmation once the admin reviews and verifies your information.
          </p>
          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Submit Another Registration
            </button>
           
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-full mx-auto">
        
        <div className="bg-white">
          {/* College Header */}
          <div className="px-12 py-4 border-b border-gray-300 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <img 
                src={logo} 
                alt="College Logo" 
                className="w-28 h-20 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Sibsagar Commerce College, Assam</h1>
                <p className="text-xl text-gray-600">Student Registration Portal</p>
              </div>
            </div>
           
          </div>

          {/* Registration Form */}
          <div className="p-12">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
              
              {/* Form Content */}
              <div className="p-8">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <div className="lg:col-span-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Basic Information</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your student ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your department"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your semester"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Address Information */}
              <div className="lg:col-span-3 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Address Information</h3>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your street address"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your city"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your state"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your PIN code"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your country"
                />
              </div>

              {/* Profile Picture */}
              <div className="lg:col-span-3 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Profile Picture</h3>
                
                <div className="flex items-center space-x-6">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          className="h-24 w-24 rounded-full object-cover border-4 border-gray-300"
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
                      <div className="h-24 w-24 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center">
                        <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <label htmlFor="image-upload" className="cursor-pointer bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-600 font-medium py-2 px-4 rounded-lg transition-colors">
                        {imagePreview ? 'Change Picture' : 'Upload Picture'}
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
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Supported formats: JPEG, PNG, WebP. Max size: 5MB
                    </p>
                    {selectedImage && (
                      <p className="text-sm text-green-600 mt-1">
                        Selected: {selectedImage.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Legacy URL Input */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or Image URL (optional)
                  </label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter image URL (will be overridden by uploaded file)"
                    disabled={!!selectedImage}
                  />
                  {selectedImage && (
                    <p className="text-sm text-gray-500 mt-1">
                      This field is disabled when an image file is selected for upload
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Section */}
              <div className="lg:col-span-3 mt-8 pt-6 border-t">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting Registration...
                      </>
                    ) : (
                      'Submit Registration'
                    )}
                  </button>
                  
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  <p><span className="text-red-500">*</span> Required fields</p>
                  <p className="mt-2">
                    <strong>Important:</strong> Your registration will be reviewed by an admin before you can use the system. 
                    You will be notified once your registration is approved.
                  </p>
                </div>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default StudentRegistration;