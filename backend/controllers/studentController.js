import Student from '../models/Student.js';
import Log from '../models/Log.js';
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
    semester, 
    imageUrl 
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
    semester, 
    imageUrl 
  } = req.body;

  const student = await Student.findByStudentId(studentId);
  
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Update fields
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
  if (imageUrl !== undefined) student.imageUrl = imageUrl;

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