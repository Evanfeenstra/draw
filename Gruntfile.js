/*global module:false*/
module.exports = function(grunt) {

  var autoprefixer = require('autoprefixer');

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    meta: {
      version: '0.1.0'
    },
    banner: "",
    // Task configuration.
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true
      },
      dist: {
        src: ['src/js/*.js'],
        dest: 'dist/js/main.min.js'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'dist/js/main.min.js'
      }
    },
    imagemin: {
      dist: {
        options: {
          optimizationLevel: 5
        },
        files: [{
           expand: true,
           cwd: 'src/images',
           src: ['**/*.{png,jpg,gif}'],
           dest: 'dist/images'
        }]
      }
    },
    sass: {                              // Task
      dist: {                            // Target
        options: {                       // Target options
          style: 'expanded'
        },
        files: {                         // Dictionary of files
          'src/css/style.css': ['src/css/**/*.scss']      // 'destination': 'source'
        }
      }
    },
    cssmin: {
       dist: {
          options: {
             banner: ''
          },
          files: {
             'dist/css/style.min.css': ['src/css/**/*.css']
          }
      }
    },
    postcss: {
        options: {
            map: true,
            processors: [
                require('autoprefixer')({
                    browsers: ['last 2 versions']
                })
            ]
        },
        dist: {
            src: 'dist/css/*.css'
        }
    },
    cmq: {
      dist: {
        files: {
          'src/css/style.css': ['src/css/style.css']      // 'destination': 'source'
        }
      }
    },
    processhtml: {
      build:{
        options: {
          process: true,
        },
        files: [
          {
            expand: true,     
            cwd: 'src/',   
            src: ['**/*.html'],
            dest: 'dist/',  
            ext: '.html'
          },
        ],
      }, 
    },
    htmlmin: {
       dist: {
          options: {
             removeComments: true,
             collapseWhitespace: true
          },
          files: [{
             expand: true,
             cwd: 'dist/',
             src: '**/*.html',
             dest: 'dist/'
          }]
       }
    }
    
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-htmlmin');
  grunt.loadNpmTasks('grunt-processhtml');
  grunt.loadNpmTasks('grunt-combine-media-queries');
  grunt.loadNpmTasks('grunt-postcss');

  // Default task.
  grunt.registerTask('default', ['concat', 'uglify', 'processhtml', 'htmlmin', 'sass', 'cmq', 'cssmin', 'postcss']);

};



