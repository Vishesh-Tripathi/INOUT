import Student from '../models/Student.js';
import Log from '../models/Log.js';
import s3Service from '../services/s3Service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getAllStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({}).sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: {
      students,
      count: students.length
    }
  });
});

export const getStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  const student = await Student.findByStudentId(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  res.json({
    success: true,
    data: {
      student
    }
  });
});

export const createStudent = asyncHandler(async (req, res) => {
  const { 
    student_id, 
    name, 
    department, 
    email, 
    phone, 
    address, 
    city, 
    state, 
    pin, 
    country, 
    semester
  } = req.body;

  // Validate required fields
  if (!student_id || !name || !department) {
    return res.status(400).json({
      success: false,
      message: 'Student ID, name, and department are required'
    });
  }

  // Check if student already exists
  const existingStudent = await Student.findByStudentId(student_id);
  if (existingStudent) {
    return res.status(409).json({
      success: false,
      message: 'Student with this ID already exists'
    });
  }

  let imageUrl = req.body.imageUrl || null; // Get imageUrl from form data if provided
  
  console.log('=== Image handling in createStudent ===');
  console.log('req.file exists:', !!req.file);
  console.log('req.body.imageUrl:', req.body.imageUrl);
  console.log('Initial imageUrl:', imageUrl);

  // Handle image upload if file is provided (this will override the form imageUrl)
  if (req.file) {
    try {
      console.log('Uploading file to S3...');
      const uploadResult = await s3Service.uploadFile(
        req.file.buffer,
        `${student_id}_profile_${req.file.originalname}`,
        req.file.mimetype,
        'student-profiles'
      );
      imageUrl = uploadResult.url;
      console.log('Upload successful, imageUrl set to:', imageUrl);
    } catch (error) {
      console.error('Error uploading student image:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload student image',
        error: error.message
      });
    }
  }
  
  console.log('Final imageUrl before saving:', imageUrl);

  const student = await Student.create({
    student_id,
    name,
    department,
    email,
    phone,
    address,
    city,
    state,
    pin,
    country,
    semester,
    imageUrl
  });

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: {
      student
    }
  });
});

export const createMultipleStudents = asyncHandler(async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Students array is required and must not be empty'
    });
  }

  // Validate each student
  const invalidStudents = students.filter(student => 
    !student.student_id || !student.name || !student.department
  );

  if (invalidStudents.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'All students must have student_id, name, and department'
    });
  }

  try {
    const result = await Student.createMany(students);

    res.status(201).json({
      success: true,
      message: `Successfully created ${result.count} students`,
      data: result
    });
  } catch (error) {
    if (error.message.includes('Duplicate student IDs')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    throw error;
  }
});

export const updateStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { 
    name, 
    department, 
    email, 
    phone, 
    address, 
    city, 
    state, 
    pin, 
    country, 
    semester
  } = req.body;

  const student = await Student.findByStudentId(studentId);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Handle image upload if file is provided
  if (req.file) {
    try {
      // Delete old image if it exists
      if (student.imageUrl) {
        // Extract S3 key from URL if it's an S3 URL
        const urlParts = student.imageUrl.split('/');
        if (urlParts.length > 3 && student.imageUrl.includes('s3')) {
          const key = urlParts.slice(3).join('/');
          try {
            await s3Service.deleteFile(key);
          } catch (error) {
            console.warn('Failed to delete old image:', error.message);
          }
        }
      }

      // Upload new image
      const uploadResult = await s3Service.uploadFile(
        req.file.buffer,
        `${studentId}_profile_${req.file.originalname}`,
        req.file.mimetype,
        'student-profiles'
      );
      student.imageUrl = uploadResult.url;
    } catch (error) {
      console.error('Error uploading student image:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload student image',
        error: error.message
      });
    }
  } else if (req.body.imageUrl !== undefined) {
    // Handle imageUrl from form data (legacy URL field)
    student.imageUrl = req.body.imageUrl;
  }

  // Update other fields
  if (name) student.name = name;
  if (department) student.department = department;
  if (email !== undefined) student.email = email;
  if (phone !== undefined) student.phone = phone;
  if (address !== undefined) student.address = address;
  if (city !== undefined) student.city = city;
  if (state !== undefined) student.state = state;
  if (pin !== undefined) student.pin = pin;
  if (country !== undefined) student.country = country;
  if (semester !== undefined) student.semester = semester;

  await student.save();

  res.json({
    success: true,
    message: 'Student updated successfully',
    data: {
      student
    }
  });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findByStudentId(studentId);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  await Student.deleteOne({ student_id: studentId });

  res.json({
    success: true,
    message: 'Student deleted successfully'
  });
});

export const getStudentsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;

  if (!['in', 'out'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be either "in" or "out"'
    });
  }

  const students = await Student.findByStatus(status);

  res.json({
    success: true,
    data: {
      students,
      count: students.length,
      status
    }
  });
});

export const getStudentsBySemester = asyncHandler(async (req, res) => {
  const { semester } = req.params;

  const semesterNum = parseInt(semester);
  if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 12) {
    return res.status(400).json({
      success: false,
      message: 'Semester must be a number between 1 and 12'
    });
  }

  const students = await Student.findBySemester(semesterNum);

  res.json({
    success: true,
    data: {
      students,
      count: students.length,
      semester: semesterNum
    }
  });
});

export const getStudentsByLocation = asyncHandler(async (req, res) => {
  const { city, state } = req.query;

  if (!city && !state) {
    return res.status(400).json({
      success: false,
      message: 'At least one of city or state must be provided'
    });
  }

  const students = await Student.findByLocation(city, state);

  res.json({
    success: true,
    data: {
      students,
      count: students.length,
      filters: { city, state }
    }
  });
});

export const toggleStudentStatus = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findByStudentId(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Store old status for logging
  const oldStatus = student.status;
  
  // Toggle status
  await student.toggleStatus();
  
  // Create log entry
  const logEntry = await Log.createLogEntry(student, student.status);

  res.json({
    success: true,
    message: `Student ${student.status === 'in' ? 'checked in' : 'checked out'} successfully`,
    data: {
      student,
      logEntry,
      previousStatus: oldStatus
    }
  });
});

export const uploadStudentImage = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No image file provided'
    });
  }

  const student = await Student.findByStudentId(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  try {
    // Delete old image if it exists
    if (student.imageUrl) {
      const urlParts = student.imageUrl.split('/');
      if (urlParts.length > 3 && student.imageUrl.includes('s3')) {
        const key = urlParts.slice(3).join('/');
        try {
          await s3Service.deleteFile(key);
        } catch (error) {
          console.warn('Failed to delete old image:', error.message);
        }
      }
    }

    // Upload new image
    const uploadResult = await s3Service.uploadFile(
      req.file.buffer,
      `${studentId}_profile_${req.file.originalname}`,
      req.file.mimetype,
      'student-profiles'
    );

    // Update student record
    student.imageUrl = uploadResult.url;
    await student.save();

    res.json({
      success: true,
      message: 'Student image uploaded successfully',
      data: {
        student,
        uploadDetails: uploadResult
      }
    });
  } catch (error) {
    console.error('Error uploading student image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload student image',
      error: error.message
    });
  }
});

export const deleteStudentImage = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findByStudentId(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  if (!student.imageUrl) {
    return res.status(404).json({
      success: false,
      message: 'No image found for this student'
    });
  }

  try {
    // Delete image from S3 if it's an S3 URL
    const urlParts = student.imageUrl.split('/');
    if (urlParts.length > 3 && student.imageUrl.includes('s3')) {
      const key = urlParts.slice(3).join('/');
      await s3Service.deleteFile(key);
    }

    // Remove image URL from student record
    student.imageUrl = null;
    await student.save();

    res.json({
      success: true,
      message: 'Student image deleted successfully',
      data: {
        student
      }
    });
  } catch (error) {
    console.error('Error deleting student image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student image',
      error: error.message
    });
  }
});

export const bulkUploadStudentImages = asyncHandler(async (req, res) => {
  const { files } = req;

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }

  const uploadResults = [];
  const errors = [];

  for (const file of files) {
    try {
      // Extract student ID from filename (assuming format: studentId_name.ext)
      const studentId = file.originalname.split('_')[0];
      
      // Find student by ID
      const student = await Student.findByStudentId(studentId);
      
      if (!student) {
        errors.push({
          file: file.originalname,
          error: `Student with ID ${studentId} not found`
        });
        continue;
      }

      // Delete old image if exists
      if (student.imageUrl) {
        const urlParts = student.imageUrl.split('/');
        if (urlParts.length > 3 && student.imageUrl.includes('s3')) {
          const key = urlParts.slice(3).join('/');
          try {
            await s3Service.deleteFile(key);
          } catch (error) {
            console.warn('Failed to delete old image:', error.message);
          }
        }
      }

      // Upload new image
      const uploadResult = await s3Service.uploadFile(
        file.buffer,
        `${studentId}_profile_${file.originalname}`,
        file.mimetype,
        'student-profiles'
      );

      // Update student record
      student.imageUrl = uploadResult.url;
      await student.save();

      uploadResults.push({
        studentId: student.student_id,
        name: student.name,
        fileName: file.originalname,
        imageUrl: uploadResult.url
      });
    } catch (error) {
      errors.push({
        file: file.originalname,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    message: `Bulk upload completed. ${uploadResults.length} images uploaded successfully`,
    data: {
      successful: uploadResults,
      errors: errors,
      totalFiles: files.length,
      successCount: uploadResults.length,
      errorCount: errors.length
    }
  });
});