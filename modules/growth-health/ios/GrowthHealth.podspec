Pod::Spec.new do |s|
  s.name           = 'GrowthHealth'
  s.version        = '1.0.0'
  s.summary        = 'Read-only Apple Health integration for Growth'
  s.description    = 'Reads running workouts and body mass samples from HealthKit.'
  s.author         = 'Timothy Empey'
  s.homepage       = 'https://github.com/TimothyEmpey/growth-app'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
