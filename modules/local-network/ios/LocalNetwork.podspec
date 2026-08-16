require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LocalNetwork'
  s.version        = package['version']
  s.summary        = 'Native TCP/UDP/TLS + streaming file I/O bridge for heishare (Layer D).'
  s.author         = 'heishare'
  s.homepage       = 'https://github.com/'
  s.platforms      = { ios: '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
end
