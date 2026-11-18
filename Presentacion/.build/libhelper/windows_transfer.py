import os
import pathlib
import runpy
import sys

# Keep Library metadata in NTFS alternate data streams on Windows.
if os.name == 'nt' and not hasattr(os, 'setxattr'):
    def setxattr(path, name, value, flags=0, **kwargs):
        if isinstance(name, bytes):
            name = name.decode('utf-8')
        pathlib.Path(str(path) + ':' + name).write_bytes(value)
    def getxattr(path, name, **kwargs):
        if isinstance(name, bytes):
            name = name.decode('utf-8')
        return pathlib.Path(str(path) + ':' + name).read_bytes()
    os.setxattr = setxattr
    os.getxattr = getxattr

runpy.run_path(str(pathlib.Path(__file__).with_name('library_file_transfer.py')), run_name='__main__')
