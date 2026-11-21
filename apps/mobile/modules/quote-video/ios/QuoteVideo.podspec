Pod::Spec.new do |s|
  s.name           = 'QuoteVideo'
  s.version        = '1.0.0'
  s.summary        = 'Puts the quote over a loop and exports an mp4'
  s.description    = 'AVFoundation export of the Quotes share card over one loop of its background.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
