import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [50, 'Department name cannot exceed 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    default: null
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [15, 'Phone number cannot exceed 15 characters'],
    default: null
  },
  status: {
    type: String,
    enum: ['in', 'out'],
    default: 'out'
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better performance
studentSchema.index({ student_id: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ name: 1 });

// Instance methods
studentSchema.methods.toggleStatus = function() {
  this.status = this.status === 'in' ? 'out' : 'in';
  return this.save();
};

studentSchema.methods.checkIn = function() {
  this.status = 'in';
  return this.save();
};

studentSchema.methods.checkOut = function() {
  this.status = 'out';
  return this.save();
};

// Static methods
studentSchema.statics.findByStudentId = function(studentId) {
  return this.findOne({ student_id: studentId.toUpperCase() });
};

studentSchema.statics.findByStatus = function(status) {
  return this.find({ status: status }).sort({ updatedAt: -1 });
};

studentSchema.statics.findByDepartment = function(department) {
  return this.find({ department: new RegExp(department, 'i') }).sort({ name: 1 });
};

studentSchema.statics.getStudentsInside = function() {
  return this.find({ status: 'in' }).sort({ updatedAt: -1 });
};

studentSchema.statics.getStudentsOutside = function() {
  return this.find({ status: 'out' }).sort({ updatedAt: -1 });
};

studentSchema.statics.createMany = async function(studentsData) {
  try {
    // Prepare the data
    const preparedData = studentsData.map(student => ({
      student_id: student.student_id.toUpperCase(),
      name: student.name,
      department: student.department,
      email: student.email || null,
      phone: student.phone || null,
      status: 'out'
    }));

    const result = await this.insertMany(preparedData, { ordered: false });
    return { 
      success: true, 
      count: result.length, 
      students: result 
    };
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key errors
      const duplicateIds = [];
      if (error.writeErrors) {
        error.writeErrors.forEach(err => {
          if (err.err && err.err.errmsg) {
            const match = err.err.errmsg.match(/student_id: "([^"]+)"/);
            if (match) duplicateIds.push(match[1]);
          }
        });
      }
      throw new Error(`Duplicate student IDs found: ${duplicateIds.join(', ')}`);
    }
    throw error;
  }
};

// Pre-save middleware
studentSchema.pre('save', function(next) {
  // Ensure student_id is uppercase
  if (this.student_id) {
    this.student_id = this.student_id.toUpperCase();
  }
  next();
});

const Student = mongoose.model('Student', studentSchema);

export default Student;