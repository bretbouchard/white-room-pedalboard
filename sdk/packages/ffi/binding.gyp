{
  "targets": [
    {
      "target_name": "white_room_ffi",
      "sources": [
        "src/binding.cpp",
        "src/serialization.cpp",
        "src/errors.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7",
        "CPPFLAGS": [
          "-Wall",
          "-Wextra",
          "-Wpedantic"
        ]
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      },
      "conditions": [
        [
          "OS=='win'",
          {
            "defines": [
              "WIN32"
            ]
          }
        ],
        [
          "OS=='mac'",
          {
            "xcode_settings": {
              "OTHER_CFLAGS+": [
                "-std=c++17"
              ]
            }
          }
        ],
        [
          "OS=='linux'",
          {
            "cflags_cc": [
              "-std=c++17"
            ]
          }
        ]
      ]
    }
  ]
}
